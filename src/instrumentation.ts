/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Starts an in-process scheduler that dispatches due motivation emails every minute,
 * so time-of-day messages work while the app is running (no external cron needed locally).
 * Disable with IN_PROCESS_SCHEDULER=false (e.g. on serverless hosts, where a cron pinger is used instead).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.IN_PROCESS_SCHEDULER === "false") return;
  if (process.env.VERCEL) return; // serverless: use /api/cron/dispatch via an external pinger

  const g = globalThis as unknown as { __fcScheduler?: NodeJS.Timeout };
  if (g.__fcScheduler) return;

  const { dispatchDueMotivation } = await import("@/lib/motivation");
  const tick = async () => {
    try {
      const r = await dispatchDueMotivation();
      if (r.sent || r.failed) console.info(`[scheduler] ${r.time} motivation: sent ${r.sent}, failed ${r.failed}`);
    } catch (e) {
      console.error("[scheduler] dispatch failed", e);
    }
  };
  g.__fcScheduler = setInterval(tick, 60 * 1000);
  setTimeout(tick, 5 * 1000);
  console.info("[scheduler] in-process motivation dispatcher started (every 60s)");
}
