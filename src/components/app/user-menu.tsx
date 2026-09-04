"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Compass, KeyRound, LayoutDashboard, LogOut, Settings, Shield, Loader2 } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = { name: string; email: string; role: "USER" | "ADMIN" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ name, email, role }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm sm:inline">{name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard className="size-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings/profile" />}>
          <Settings className="size-4" /> Profile settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings/account" />}>
          <KeyRound className="size-4" /> Account &amp; security
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard?tour=1" />}>
          <Compass className="size-4" /> Replay the tour
        </DropdownMenuItem>
        {role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="size-4" /> Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => startTransition(() => logoutAction())}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
