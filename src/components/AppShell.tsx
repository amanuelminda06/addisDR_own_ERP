"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";
import { logoutAction } from "@/lib/actions/auth";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; username: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile overlay */}
      {open ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="relative h-9 w-9 shrink-0">
              <Image
                src="/logo.png"
                alt="AddisDR ERP"
                fill
                className="rounded-lg object-contain"
                priority
              />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-800">
                AddisDR ERP
              </span>
              <span className="text-[11px] text-slate-400">
                Personal management
              </span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (!item.exact && pathname.startsWith(`${item.href}/`));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "sidebar-link",
                          active && "sidebar-link-active",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white">
              {initials || "A"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-400">@{user.username}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="sidebar-link w-full text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Icon name="LogOut" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <button
            aria-label="Open navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Icon name="Menu" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">
              Welcome back, {user.name.split(" ")[0]}
            </p>
            <p className="hidden text-xs text-slate-400 sm:block">
              Africa/Addis_Ababa · Ethiopian Birr (ETB)
            </p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
