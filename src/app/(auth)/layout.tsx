import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME, AI_DISCLAIMER_SHORT } from "@/lib/constants";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </span>
          <span className="text-lg tracking-tight">{APP_NAME}</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">{AI_DISCLAIMER_SHORT}</footer>
    </div>
  );
}
