import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const [sessions, counts] = await Promise.all([
    db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    db.user.findUnique({ where: { id: user.id }, select: { _count: { select: { workoutLogs: true, mealLogs: true, progressEntries: true, chatMessages: true } } } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Security and data for {user.email}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>
            Member since {formatDateTime(user.createdAt)} · {sessions} active session{sessions === 1 ? "" : "s"} · {counts?._count.workoutLogs ?? 0} workouts, {counts?._count.mealLogs ?? 0} meals, {counts?._count.progressEntries ?? 0} check-ins, {counts?._count.chatMessages ?? 0} chat messages stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Your data lives in this demo&apos;s database only and is never sold or shared. AI requests send your profile and recent logs to the configured AI provider on free tiers — don&apos;t enter sensitive medical details.</CardContent>
      </Card>
      <AccountForms isAdmin={user.role === "ADMIN"} email={user.email} />
    </div>
  );
}
