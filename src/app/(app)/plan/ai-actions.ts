"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { AiError, completeChat, isAiConfigured } from "@/lib/ai/provider";
import { ASSISTANT_RULES, buildUserContext } from "@/lib/ai/context";
import { rateLimit } from "@/lib/rate-limit";

/** Ask the model for short coaching notes about the active plan and store them on the plan. */
export async function generatePlanNotesAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  if (!isAiConfigured()) return { ok: false, message: "AI provider not configured." };
  const limit = rateLimit(`ai:plan:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: `You can refresh coaching notes 5 times an hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };

  const plan = await db.fitnessPlan.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!plan) return { ok: false, message: "No active plan yet." };

  try {
    const context = await buildUserContext(user.id);
    const { text } = await completeChat({
      feature: "plan",
      userId: user.id,
      maxOutputTokens: 700,
      system: `${ASSISTANT_RULES}\n\n=== USER DATA ===\n${context}\n=== END ===`,
      messages: [
        {
          role: "user",
          content:
            "Write coaching notes for my current weekly plan in 5 short bullet points: (1) what the plan is designed to do for my goal, (2) one form/technique tip for the hardest exercise, (3) how to progress week to week, (4) a recovery/sleep/protein reminder tied to my targets, (5) one realistic warning sign to ease off. Plain text bullets starting with '- ', no headings, under 160 words, end with the one-line AI disclaimer.",
        },
      ],
    });
    await db.fitnessPlan.update({ where: { id: plan.id }, data: { aiNotes: text.trim() } });
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    return { ok: true, message: "Coaching notes updated." };
  } catch (e) {
    return { ok: false, message: e instanceof AiError ? e.message : "Could not generate notes right now." };
  }
}
