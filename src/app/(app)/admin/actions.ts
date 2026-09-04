"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { articleSchema, exerciseSchema, foodSchema, templateSchema } from "@/lib/validators/admin";
import type { ActionState } from "@/lib/validators/auth";

type Result = { ok: boolean; message: string };

function fieldErrors(e: z.ZodError) {
  return z.flattenError(e).fieldErrors as ActionState["fieldErrors"];
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on" || fd.get(k) === "true";
}

// ───────────────────────────── Users ─────────────────────────────

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<Result> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, message: "You can't disable your own admin account." };
  await db.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/admin/users");
  return { ok: true, message: isActive ? "Account re-enabled." : "Account disabled and signed out everywhere." };
}

export async function deleteUserAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, message: "You can't delete your own admin account." };
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { ok: false, message: "User not found." };
  await db.user.delete({ where: { id: userId } }); // cascades to all user data
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true, message: "User and all their data deleted." };
}

// ───────────────────────────── Foods ─────────────────────────────

export async function upsertFoodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = { ...Object.fromEntries(fd), isVegetarian: bool(fd, "isVegetarian"), isVegan: bool(fd, "isVegan"), isGlutenFree: bool(fd, "isGlutenFree") };
  const parsed = foodSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (id) await db.foodItem.update({ where: { id }, data });
    else await db.foodItem.create({ data });
  } catch {
    return { error: "A food with that name already exists." };
  }
  revalidatePath("/admin/foods");
  revalidatePath("/nutrition");
  return { success: id ? "Food updated." : "Food added." };
}

export async function setFoodActiveAction(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  await db.foodItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/foods");
  revalidatePath("/nutrition");
  return { ok: true, message: isActive ? "Food visible again." : "Food hidden from users." };
}

// ───────────────────────────── Exercises ─────────────────────────────

export async function upsertExerciseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = exerciseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (id) await db.exercise.update({ where: { id }, data });
    else await db.exercise.create({ data });
  } catch {
    return { error: "An exercise with that name already exists." };
  }
  revalidatePath("/admin/exercises");
  return { success: id ? "Exercise updated." : "Exercise added." };
}

export async function setExerciseActiveAction(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  await db.exercise.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/exercises");
  return { ok: true, message: isActive ? "Exercise re-enabled." : "Exercise hidden from new plans." };
}

// ───────────────────────────── Plan templates ─────────────────────────────

export async function upsertTemplateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = templateSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, structure, ...data } = parsed.data;
  const names = [...new Set(structure.flatMap((s) => s.exerciseNames))];
  const known = await db.exercise.findMany({ where: { name: { in: names } }, select: { name: true } });
  const missing = names.filter((n) => !known.some((k) => k.name === n));
  if (missing.length) return { error: `Unknown exercise names: ${missing.join(", ")}` };
  try {
    if (id) await db.planTemplate.update({ where: { id }, data: { ...data, structure } });
    else await db.planTemplate.create({ data: { ...data, structure } });
  } catch {
    return { error: "A template with that name already exists." };
  }
  revalidatePath("/admin/templates");
  return { success: id ? "Template updated." : "Template added." };
}

export async function setTemplateActiveAction(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  await db.planTemplate.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/templates");
  return { ok: true, message: isActive ? "Template enabled." : "Template disabled for new plans." };
}

// ───────────────────────────── Articles ─────────────────────────────

export async function upsertArticleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = articleSchema.safeParse({ ...Object.fromEntries(fd), isPublished: bool(fd, "isPublished") });
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (id) await db.contentArticle.update({ where: { id }, data });
    else await db.contentArticle.create({ data });
  } catch {
    return { error: "An article with that slug already exists." };
  }
  revalidatePath("/admin/articles");
  revalidatePath("/learn");
  return { success: id ? "Article saved." : "Article created." };
}

export async function deleteArticleAction(id: string): Promise<Result> {
  await requireAdmin();
  await db.contentArticle.delete({ where: { id } });
  revalidatePath("/admin/articles");
  revalidatePath("/learn");
  return { ok: true, message: "Article deleted." };
}

export async function setArticlePublishedAction(id: string, isPublished: boolean): Promise<Result> {
  await requireAdmin();
  await db.contentArticle.update({ where: { id }, data: { isPublished } });
  revalidatePath("/admin/articles");
  revalidatePath("/learn");
  return { ok: true, message: isPublished ? "Published." : "Unpublished." };
}
