"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        The page hit an unexpected error. Your data is safe — try again, or head back to the dashboard.
        {error.digest && <span className="mt-1 block font-mono text-xs">ref {error.digest}</span>}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Try again
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          Dashboard
        </Button>
      </div>
    </main>
  );
}
