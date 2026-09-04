import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

export async function generateMetadata(props: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await db.contentArticle.findUnique({ where: { slug }, select: { title: true } });
  return { title: a?.title ?? "Article" };
}

function renderBody(body: string) {
  const blocks = body.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.split("\n").map((l) => l.trimEnd());
    if (lines[0]?.startsWith("## ")) return <h2 key={i} className="mt-6 text-lg font-semibold">{lines[0].slice(3)}</h2>;
    if (lines.every((l) => /^\s*-\s+/.test(l))) {
      return (
        <ul key={i} className="my-3 list-disc space-y-1 pl-5">
          {lines.map((l, j) => (
            <li key={j}>{l.replace(/^\s*-\s+/, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-3 leading-relaxed">
        {lines.join(" ")}
      </p>
    );
  });
}

export default async function ArticlePage(props: PageProps<"/learn/[slug]">) {
  const [, { slug }] = await Promise.all([requireUser(), props.params]);
  const a = await db.contentArticle.findUnique({ where: { slug } });
  if (!a || !a.isPublished) notFound();
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All guides
      </Link>
      <div>
        <Badge variant="outline">{a.category}</Badge>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{a.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updated {formatDateTime(a.updatedAt)}</p>
      </div>
      <p className="text-lg text-muted-foreground">{a.excerpt}</p>
      <DisclaimerBanner />
      <div className="text-[15px]">{renderBody(a.body)}</div>
    </article>
  );
}
