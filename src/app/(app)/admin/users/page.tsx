import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveSwitch, DangerButton, SearchBox } from "@/components/admin/admin-controls";
import { deleteUserAction, setUserActiveAction } from "@/app/(app)/admin/actions";
import { getAdminUsers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { GOAL_OPTIONS, labelOf } from "@/lib/engine/options";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const [admin, sp] = await Promise.all([requireAdmin(), props.searchParams]);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const users = await getAdminUsers(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? "" : "s"}
          {q ? ` matching “${q}”` : ""} · disabling signs the user out everywhere; deleting removes all their data.
        </p>
        <Suspense>
          <SearchBox placeholder="Search name or email…" />
        </Suspense>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">User</th>
                  <th className="px-4 py-2 font-normal">Status</th>
                  <th className="px-4 py-2 font-normal">Goal</th>
                  <th className="px-4 py-2 font-normal">Activity</th>
                  <th className="px-4 py-2 font-normal">Last login</th>
                  <th className="px-4 py-2 font-normal">Joined</th>
                  <th className="px-4 py-2 text-right font-normal">Enabled</th>
                  <th className="px-4 py-2 font-normal" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const self = u.id === admin.id;
                  return (
                    <tr key={u.id} className={!u.isActive ? "opacity-60" : undefined}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 font-medium">
                          {u.name}
                          {u.role === "ADMIN" && <Badge>admin</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {u.emailVerified ? <Badge variant="secondary">verified</Badge> : <Badge variant="outline">unverified</Badge>}
                          {u.profile?.onboardingDone ? <Badge variant="secondary">onboarded</Badge> : <Badge variant="outline">no profile</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{u.profile ? labelOf(GOAL_OPTIONS, u.profile.goal) : "—"}</td>
                      <td className="px-4 py-2 text-xs tabular-nums text-muted-foreground">
                        {u._count.workoutLogs} workouts · {u._count.mealLogs} meals · {u._count.chatMessages} chat
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                      <td className="px-4 py-2 text-right">{self ? <span className="text-xs text-muted-foreground">you</span> : <ActiveSwitch checked={u.isActive} label={`Enable ${u.email}`} id={u.id} action={setUserActiveAction} />}</td>
                      <td className="px-4 py-2 text-right">
                        {!self && (
                          <DangerButton confirmText={`Delete ${u.email} and ALL their data? This cannot be undone.`} id={u.id} action={deleteUserAction}>
                            Delete
                          </DangerButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
