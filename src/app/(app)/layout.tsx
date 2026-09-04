import { AppHeader } from "@/components/app/app-header";
import { AppNav } from "@/components/app/app-nav";
import { MobileBar } from "@/components/app/mobile-bar";
import { AI_DISCLAIMER_SHORT } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toDayKey } from "@/lib/dates";
import { getReminders, remindersForToday } from "@/lib/tracking/reminders";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const reminders = await getReminders(user.id);
  const due = remindersForToday(reminders, toDayKey()).filter((r) => r.status === "due").length;
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} dueReminders={due} />
      <AppNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 md:pb-8">{children}</main>
      <footer className="border-t px-4 py-4 pb-20 text-center text-xs text-muted-foreground md:pb-4">{AI_DISCLAIMER_SHORT}</footer>
      <MobileBar />
    </div>
  );
}
