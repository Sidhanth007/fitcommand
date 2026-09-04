import Link from "next/link";
import { Bell, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { APP_NAME } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";

export function AppHeader({ user, dueReminders = 0 }: { user: SessionUser; dueReminders?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </span>
          <span className="text-lg tracking-tight">{APP_NAME}</span>
          {user.role === "ADMIN" && (
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              Admin
            </Badge>
          )}
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative" nativeButton={false} render={<Link id="tour-bell" href="/reminders" aria-label={`Reminders${dueReminders ? `, ${dueReminders} due` : ""}`} />}>
            <Bell className="size-5" />
            {dueReminders > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{dueReminders > 9 ? "9+" : dueReminders}</span>}
          </Button>
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </div>
    </header>
  );
}
