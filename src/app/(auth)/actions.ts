"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroyAllSessions, destroySession, roleForEmail } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/brevo";
import { resetPasswordTemplate, verifyEmailTemplate } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  otpSchema,
  registerSchema,
  resendSchema,
  resetPasswordSchema,
  type ActionState,
} from "@/lib/validators/auth";

// A constant bcrypt hash used to equalise timing when the account doesn't exist.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Z8Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
}

function fieldErrorsOf(error: z.ZodError): ActionState["fieldErrors"] {
  return z.flattenError(error).fieldErrors as ActionState["fieldErrors"];
}

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

async function sendVerificationCode(userId: string, name: string, email: string): Promise<{ error?: string }> {
  const otp = await issueOtp(userId, "VERIFY_EMAIL");
  if (!otp.ok) return { error: otp.error };
  const tpl = verifyEmailTemplate(name, otp.code);
  const sent = await sendEmail({ to: { email, name }, ...tpl });
  return sent.ok ? {} : { error: sent.error };
}

// ───────────────────────────── Register ─────────────────────────────

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { name: raw.name ?? "", email: raw.email ?? "" };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const limit = rateLimit(`register:${await clientIp()}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.`, values };

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });

  let userId: string;
  if (existing) {
    if (existing.emailVerified) {
      return { error: "An account with this email already exists. Try logging in instead.", values };
    }
    // Unverified account: refresh credentials and re-send the code.
    const updated = await db.user.update({
      where: { id: existing.id },
      data: { name, passwordHash: await hashPassword(password), role: roleForEmail(email) },
    });
    userId = updated.id;
  } else {
    const created = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: roleForEmail(email) },
    });
    userId = created.id;
  }

  const sent = await sendVerificationCode(userId, name, email);
  if (sent.error) return { error: sent.error, values };

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

// ───────────────────────────── Verify email ─────────────────────────────

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = otpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const limit = rateLimit(`verify:${await clientIp()}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const { email, code } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "We couldn't find an account for that email." };
  if (!user.isActive) return { error: "This account has been disabled." };

  if (!user.emailVerified) {
    const result = await verifyOtp(user.id, "VERIFY_EMAIL", code);
    if (!result.ok) return { error: result.error };
    await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date(), lastLoginAt: new Date() } });
  }

  await createSession(user.id);
  redirect("/dashboard");
}

// ───────────────────────────── Resend code ─────────────────────────────

export async function resendCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const limit = rateLimit(`resend:${await clientIp()}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };

  const { email, purpose } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  // Do not reveal whether the account exists.
  if (!user || !user.isActive) return { success: "If that email is registered, a new code is on its way." };

  if (purpose === "VERIFY_EMAIL") {
    if (user.emailVerified) return { error: "This email is already verified — you can log in." };
    const sent = await sendVerificationCode(user.id, user.name, user.email);
    return sent.error ? { error: sent.error } : { success: "A new code has been sent." };
  }

  const otp = await issueOtp(user.id, "RESET_PASSWORD");
  if (!otp.ok) return { error: otp.error };
  const sent = await sendEmail({ to: { email: user.email, name: user.name }, ...resetPasswordTemplate(user.name, otp.code) });
  return sent.ok ? { success: "A new code has been sent." } : { error: sent.error };
}

// ───────────────────────────── Login ─────────────────────────────

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { email: raw.email ?? "" };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const { email, password, next } = parsed.data;
  const ip = await clientIp();
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  const emailLimit = rateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !emailLimit.ok) {
    const wait = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return { error: `Too many login attempts. Try again in ${wait}s.`, values };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "Incorrect email or password.", values };
  if (!user.isActive) return { error: "This account has been disabled. Contact the administrator.", values };

  if (!user.emailVerified) {
    await sendVerificationCode(user.id, user.name, user.email);
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&reason=unverified`);
  }

  const role = roleForEmail(user.email);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), ...(role !== user.role ? { role } : {}) },
  });
  await createSession(user.id);
  redirect(safeNext(next));
}

// ───────────────────────────── Logout ─────────────────────────────

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

// ───────────────────────────── Forgot / reset password ─────────────────────────────

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: { email: raw.email ?? "" } };

  const limit = rateLimit(`forgot:${await clientIp()}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };

  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const otp = await issueOtp(user.id, "RESET_PASSWORD");
    if (otp.ok) {
      await sendEmail({ to: { email: user.email, name: user.name }, ...resetPasswordTemplate(user.name, otp.code) });
    }
  }
  // Always continue to the reset page so account existence isn't revealed.
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const limit = rateLimit(`reset:${await clientIp()}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const { email, code, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { error: "Invalid or expired code." };

  const result = await verifyOtp(user.id, "RESET_PASSWORD", code);
  if (!result.ok) return { error: result.error };

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      // Proving control of the inbox also verifies the email.
      emailVerified: user.emailVerified ?? new Date(),
    },
  });
  await destroyAllSessions(user.id);

  redirect("/login?reset=1");
}
