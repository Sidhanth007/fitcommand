import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/constants";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#assistant", label: "AI Assistant" },
];

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </span>
          <span className="text-lg tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button nativeButton={false} render={<Link href="/dashboard" />}>
              Open dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="hidden sm:inline-flex" nativeButton={false} render={<Link href="/login" />}>
                Log in
              </Button>
              <Button nativeButton={false} render={<Link href="/register" />}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
