"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Result = { ok: boolean; message: string };

/** On/off switch bound to a server action of shape (id, next) => Result. */
export function ActiveSwitch({ checked, id, action, label }: { checked: boolean; id: string; action: (id: string, next: boolean) => Promise<Result>; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={label}
      onCheckedChange={(v: boolean) =>
        start(async () => {
          const r = await action(id, v);
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    />
  );
}

/** Confirm-then-run button bound to a server action of shape (id) => Result. */
export function DangerButton({ id, action, confirmText, children }: { id: string; action: (id: string) => Promise<Result>; confirmText: string; children: ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          const r = await action(id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      <Trash2 className="size-3.5" /> {children}
    </Button>
  );
}

export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <form
      className="relative w-full sm:w-72"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
        router.push(q ? `?q=${encodeURIComponent(q)}` : "?");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder={placeholder} className="pl-9" />
    </form>
  );
}
