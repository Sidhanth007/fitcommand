import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveSwitch, DangerButton } from "@/components/admin/admin-controls";
import { ArticleDialog } from "@/components/admin/forms";
import { deleteArticleAction, setArticlePublishedAction } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Admin · Articles" };

export default async function AdminArticlesPage() {
  await requireAdmin();
  const articles = await db.contentArticle.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {articles.length} article{articles.length === 1 ? "" : "s"}. Published ones appear under{" "}
          <Link href="/learn" className="underline-offset-4 hover:underline">
            Learn
          </Link>
          .
        </p>
        <ArticleDialog />
      </div>
      <Card>
        <CardContent className="p-0">
          {articles.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No articles yet. Create one — e.g. “Protein basics for vegetarians” or “How to read your macro targets”.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Article</th>
                  <th className="px-4 py-2 font-normal">Category</th>
                  <th className="px-4 py-2 font-normal">Updated</th>
                  <th className="px-4 py-2 text-right font-normal">Published</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">/learn/{a.slug}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{a.category}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{formatDateTime(a.updatedAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <ActiveSwitch checked={a.isPublished} label={`Publish ${a.title}`} id={a.id} action={setArticlePublishedAction} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ArticleDialog v={{ ...a }} />
                        <DangerButton confirmText={`Delete “${a.title}”?`} id={a.id} action={deleteArticleAction}>
                          Delete
                        </DangerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
