import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage() {
  await requireUser();
  const articles = await db.contentArticle.findMany({ where: { isPublished: true }, orderBy: { updatedAt: "desc" }, select: { id: true, slug: true, title: true, excerpt: true, category: true } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BookOpen className="size-6 text-primary" /> Learn
        </h1>
        <p className="text-muted-foreground">Short, practical guides written for this app.</p>
      </div>
      <DisclaimerBanner />
      {articles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing published yet</CardTitle>
            <CardDescription>Guides will appear here once the administrator publishes them.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.id} href={`/learn/${a.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    {a.category}
                  </Badge>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <CardDescription>{a.excerpt}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
