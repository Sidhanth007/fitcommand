import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveSwitch } from "@/components/admin/admin-controls";
import { TemplateDialog } from "@/components/admin/forms";
import { setTemplateActiveAction } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, MUSCLE_LABELS, labelOf } from "@/lib/engine/options";
import type { TemplateSession } from "@/lib/engine/workout";

export const metadata: Metadata = { title: "Admin · Plan templates" };

export default async function AdminTemplatesPage() {
  await requireAdmin();
  const templates = await db.planTemplate.findMany({ orderBy: [{ isActive: "desc" }, { goal: "asc" }, { daysPerWeek: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} templates. The plan engine picks the best match for each user by goal, experience and days per week.</p>
        <TemplateDialog goals={GOAL_OPTIONS} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => {
          const sessions = t.structure as TemplateSession[];
          return (
            <Card key={t.id} className={!t.isActive ? "opacity-60" : undefined}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{labelOf(GOAL_OPTIONS, t.goal)}</Badge>
                    <Badge variant="outline">{labelOf(EXPERIENCE_OPTIONS, t.experience)}</Badge>
                    <Badge variant="outline">{t.daysPerWeek} days/wk</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ActiveSwitch checked={t.isActive} label={`Enable ${t.name}`} id={t.id} action={setTemplateActiveAction} />
                  <TemplateDialog goals={GOAL_OPTIONS} v={{ ...t }} />
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5 text-sm">
                  {sessions.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.title}</span> <span className="text-xs text-muted-foreground">({MUSCLE_LABELS[s.focus]})</span>
                      <div className="text-xs text-muted-foreground">{s.exerciseNames.join(" · ")}</div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
