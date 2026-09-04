import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HealthBadge } from "@/components/nutrition/health-badge";
import { ActiveSwitch, SearchBox } from "@/components/admin/admin-controls";
import { FoodDialog } from "@/components/admin/forms";
import { setFoodActiveAction } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Foods" };

export default async function AdminFoodsPage(props: PageProps<"/admin/foods">) {
  const [, sp] = await Promise.all([requireAdmin(), props.searchParams]);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const [foods, total, categories] = await Promise.all([
    db.foodItem.findMany({ where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }, { tags: { has: q } }] } : {}, orderBy: [{ isActive: "desc" }, { name: "asc" }], take: 150 }),
    db.foodItem.count(),
    db.foodItem.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  const cats = categories.map((c) => c.category);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total} foods in the library · showing {foods.length}
          {q ? ` matching “${q}”` : ""}. Hidden foods stay on old logs but disappear from search and ideas.
        </p>
        <div className="flex items-center gap-2">
          <Suspense>
            <SearchBox placeholder="Search foods, categories, tags…" />
          </Suspense>
          <FoodDialog categories={cats} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Food</th>
                  <th className="px-4 py-2 font-normal">Serving</th>
                  <th className="px-4 py-2 text-right font-normal">kcal</th>
                  <th className="px-4 py-2 text-right font-normal">P / C / F</th>
                  <th className="px-4 py-2 font-normal">Health</th>
                  <th className="px-4 py-2 font-normal">Flags</th>
                  <th className="px-4 py-2 text-right font-normal">Visible</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {foods.map((f) => (
                  <tr key={f.id} className={!f.isActive ? "opacity-60" : undefined}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.category}
                        {f.tags.length ? ` · ${f.tags.join(", ")}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{f.servingLabel}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{Math.round(f.calories)}</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {Math.round(f.proteinG)} / {Math.round(f.carbsG)} / {Math.round(f.fatG)}
                    </td>
                    <td className="px-4 py-2">
                      <HealthBadge score={f.healthScore} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{[f.isVegan ? "vegan" : f.isVegetarian ? "veg" : "non-veg", f.isGlutenFree ? "GF" : null].filter(Boolean).join(" · ")}</td>
                    <td className="px-4 py-2 text-right">
                      <ActiveSwitch checked={f.isActive} label={`Show ${f.name}`} id={f.id} action={setFoodActiveAction} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <FoodDialog categories={cats} v={{ ...f }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
