"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroyAllSessions, destroySession, requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema, type ActionState } from "@/lib/validators/auth";

const changeSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"] };
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { success: "Password updated. Other devices will need to log in again." };
}

const deleteSchema = z.object({ confirmEmail: z.string().trim().toLowerCase(), password: z.string().min(1, "Enter your password") });

export async function deleteAccountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"] };
  if (parsed.data.confirmEmail !== user.email.toLowerCase()) return { fieldErrors: { confirmEmail: ["Type your email exactly to confirm"] } };
  if (user.role === "ADMIN") return { error: "The administrator account can't be deleted from here." };
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.password, row.passwordHash))) return { fieldErrors: { password: ["Password is incorrect"] } };

  await destroyAllSessions(user.id);
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  redirect("/?deleted=1");
}
