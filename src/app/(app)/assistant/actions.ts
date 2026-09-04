"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export async function clearChatAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db.chatMessage.deleteMany({ where: { userId: user.id } });
  revalidatePath("/assistant");
  return { ok: true };
}
