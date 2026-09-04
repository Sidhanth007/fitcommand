import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, Mail, Target, UserCheck, UserPlus, Users, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AiCallsChart, SignupsChart } from "@/components/admin/admin-charts";
import { getAdminOverview } from "@/lib/admin/queries";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  const aiSuccess = o.ai7.calls ? Math.round(((o.ai7.calls - o.ai7.failed) / o.ai7.calls) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Registered users" value={String(o.users)} hint={`${o.verified} verified · ${o.disabled} disabled`} icon={Users} />
        <StatTile label="New users" value={String(o.new7)} unit="/ 7 days" hint={`${o.new30} in 30 days`} icon={UserPlus} />
        <StatTile label="Active users" value={String(o.activeUsers7)} unit="/ 7 days" hint={`${o.todayLogins} logged in today`} icon={UserCheck} />
        <StatTile label="Goals" value={String(o.goals.ACTIVE ?? 0)} unit="active" hint={`${o.goals.COMPLETED ?? 0} completed`} icon={Target} />
        <StatTile label="Workouts logged" value={String(o.workouts7)} unit="/ 7 days" hint={`${o.skips7} misses recorded`} icon={Activity} />
        <StatTile label="Meals logged" value={String(o.meals7)} unit="/ 7 days" icon={UtensilsCrossed} />
        <StatTile label="AI calls" value={String(o.ai7.calls)} unit="/ 7 days" hint={aiSuccess == null ? `${o.aiAll.calls} all-time` : `${aiSuccess}% ok · avg ${o.ai7.avgLatencyMs} ms`} icon={Bot} />
        <StatTile label="Digest emails" value={String(o.digest24)} unit="/ 24 h" hint="Brevo free tier: 300/day" icon={Mail} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups · last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={o.signupsByDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI usage · last 14 days</CardTitle>
            <CardDescription>
              Provider: {env.aiProvider === "gemini" ? `Gemini (${env.geminiModel})` : `Groq (${env.groqModel})`} · ~{(o.aiAll.inputTokens + o.aiAll.outputTokens).toLocaleString()} tokens all-time (estimated) · {o.chat7} user messages this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiCallsChart data={o.aiByDay} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most-logged foods · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {o.topFoods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meals logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {o.topFoods.map((f, i) => {
                  const max = o.topFoods[0]!.count;
                  return (
                    <li key={f.name} className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>
                          <span className="mr-2 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                          {f.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{f.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(f.count / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent signups</CardTitle>
            <Link href="/admin/users" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              All users
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {o.recentSignups.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {u.emailVerified ? <Badge variant="secondary">verified</Badge> : <Badge variant="outline">unverified</Badge>}
                    {formatDateTime(u.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
