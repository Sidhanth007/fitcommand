"use client";

import { useTransition } from "react";
import { Mail, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteReminderAction, sendDigestNowAction, toggleReminderAction } from "@/app/(app)/reminders/actions";
import { cn } from "@/lib/utils";

export type ReminderView = { id: string; type: string; emoji: string; title: string; timeOfDay: string; daysOfWeek: number[]; emailDigest: boolean; enabled: boolean; lastSentAt: string | null };

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function ReminderList({ reminders }: { reminders: ReminderView[] }) {
  const [pending, start] = useTransition();
  if (reminders.length === 0) return <p className="text-sm text-muted-foreground">No reminders yet. Add one for your workout time, a mid-afternoon water nudge, or a morning weigh-in.</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {reminders.map((r) => (
        <li key={r.id} className={cn("flex items-center gap-3 px-4 py-3", !r.enabled && "opacity-60")}>
          <span className="text-xl" aria-hidden>
            {r.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{r.title}</span>
              {r.emailDigest && <Mail className="size-3.5 text-muted-foreground" aria-label="Included in email digest" />}
            </div>
            <div className="text-xs text-muted-foreground">
              {r.timeOfDay} · {r.daysOfWeek.length === 7 ? "Every day" : r.daysOfWeek.length === 5 && !r.daysOfWeek.includes(0) && !r.daysOfWeek.includes(6) ? "Weekdays" : [...r.daysOfWeek].sort().map((d) => DAYS[d]).join(" ")}
            </div>
          </div>
          <Switch checked={r.enabled} disabled={pending} onCheckedChange={(v: boolean) => start(async () => void (await toggleReminderAction(r.id, v)))} aria-label={`${r.enabled ? "Disable" : "Enable"} ${r.title}`} />
          <Button size="icon" variant="ghost" className="size-8" aria-label={`Delete ${r.title}`} disabled={pending} onClick={() => start(async () => void (await deleteReminderAction(r.id)))}>
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function SendDigestButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await sendDigestNowAction();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      <Send className="size-4" /> {pending ? "Sending…" : "Send my digest now"}
    </Button>
  );
}
