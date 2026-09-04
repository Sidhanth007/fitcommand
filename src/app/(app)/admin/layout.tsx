import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground">Signed in as the only administrator ({admin.email}).</p>
        </div>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
