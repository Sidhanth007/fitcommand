import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AI_DISCLAIMER, APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-amber-500" />
              Important notice
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{AI_DISCLAIMER}</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-muted-foreground">
            <Link href="/#features" className="hover:text-foreground">Features</Link>
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/#how-it-works" className="hover:text-foreground">How it works</Link>
            <Link href="/register" className="hover:text-foreground">Create account</Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {APP_NAME}. Demo application.</span>
          <span>Built with Next.js, Prisma, Neon, Brevo &amp; Gemini — all on free tiers.</span>
        </div>
      </div>
    </footer>
  );
}
