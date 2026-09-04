"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveMotivationAction, sendMotivationNowAction, sendWeeklyReviewNowAction } from "@/app/(app)/reminders/actions";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  initial: { enabled: boolean; timeOfDay: string; daysOfWeek: number[]; weeklyReview: boolean } | null;
  email: string;
  lastSent: string | null;
  recent: { dayKey: string; subject: string; body: string; source: string; channel: string }[];
  appRunningNote: string;
};

export function MotivationCard({ initial, email, lastSent, recent, appRunningNote }: Props) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [weekly, setWeekly] = useState(initial?.weeklyReview ?? true);
  const [time, setTime] = useState(initial?.timeOfDay ?? "07:00");
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
  const [saving, startSave] = useTransition();
  const [sending, startSend] = useTransition();
  const [sendingWeekly, startWeekly] = useTransition();

  const save = (next?: Partial<{ enabled: boolean; timeOfDay: string; daysOfWeek: number[]; weeklyReview: boolean }>) =>
    startSave(async () => {
      const r = await saveMotivationAction({ enabled, timeOfDay: time, daysOfWeek: days, weeklyReview: weekly, ...next });
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> Daily motivation email
          </CardTitle>
          <CardDescription>A short, personal push written by the AI (today&apos;s session, your streak, one first step) delivered to {email} at a time you choose.</CardDescription>
        </div>
        <Switch
          checked={enabled}
          disabled={saving}
          aria-label="Enable daily motivation email"
          onCheckedChange={(v: boolean) => {
            setEnabled(v);
            save({ enabled: v });
          }}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mtime">Time</Label>
            <Input id="mtime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button key={i} type="button" aria-pressed={on} onClick={() => setDays((s) => (on ? s.filter((x) => x !== i) : [...s, i].sort()))} className={cn("size-9 rounded-md border text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            checked={weekly}
            onChange={(e) => {
              setWeekly(e.target.checked);
              save({ weeklyReview: e.target.checked });
            }}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              <CalendarCheck className="size-3.5 text-primary" /> Sunday weekly review
            </span>
            <span className="text-muted-foreground">Adherence, intake vs targets, weight trend, best/worst nutrition days and one focus for next week — sent Sundays at the same time.</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => save()} disabled={saving || days.length === 0}>
            {saving ? "Saving…" : "Save schedule"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={sending}
            onClick={() =>
              startSend(async () => {
                const r = await sendMotivationNowAction();
                if (r.ok) toast.success(r.message);
                else toast.error(r.message, { duration: 8000 });
              })
            }
          >
            <Send className="size-3.5" /> {sending ? "Writing & sending…" : "Send me one now"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={sendingWeekly}
            onClick={() =>
              startWeekly(async () => {
                const r = await sendWeeklyReviewNowAction();
                if (r.ok) toast.success(r.message);
                else toast.error(r.message, { duration: 8000 });
              })
            }
          >
            <CalendarCheck className="size-3.5" /> {sendingWeekly ? "Compiling…" : "Send weekly review now"}
          </Button>
          {lastSent && <span className="text-xs text-muted-foreground">Last sent {lastSent}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{appRunningNote}</p>
        {recent.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Recent messages ({recent.length})</summary>
            <ul className="mt-2 space-y-2">
              {recent.map((m, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {m.dayKey} · {m.channel === "weekly" ? "weekly review" : "daily"}
                    </span>
                    <span>{m.source === "ai" ? "AI-written" : "standard"}</span>
                  </div>
                  <div className="mt-1 font-medium">{m.subject}</div>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{m.body.split("\n\nOpen your")[0]}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
