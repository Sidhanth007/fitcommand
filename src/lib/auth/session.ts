import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "fc_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const h = await headers();

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      ipAddress: (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Invalidate every session for a user (e.g. after a password reset). */
export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  emailVerified: Date | null;
  isActive: boolean;
  createdAt: Date;
};

/**
 * Resolve the current user from the session cookie.
 * Cached per request so layouts, pages and actions share one DB lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date() || !session.user.isActive) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
});

/** For pages/layouts: redirect to login when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  return user;
}

/** For admin pages/layouts: only the single configured admin may pass. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Determine the role for an email: the configured ADMIN_EMAIL is the only admin. */
export function roleForEmail(email: string): "USER" | "ADMIN" {
  const admin = env.adminEmail;
  return admin && email.trim().toLowerCase() === admin ? "ADMIN" : "USER";
}
