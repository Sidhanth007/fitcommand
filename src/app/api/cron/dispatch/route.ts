import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { dispatchDueMotivation } from "@/lib/motivation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Minute-level dispatcher for time-of-day messages (daily motivation emails).
 * Call it every 1–15 minutes with `Authorization: Bearer <CRON_SECRET>` (e.g. cron-job.org, free).
 * While the app runs locally, src/instrumentation.ts calls the same logic automatically.
 */
export async function GET(request: NextRequest) {
  const secret = env.cronSecret;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await dispatchDueMotivation();
  return NextResponse.json(result);
}
