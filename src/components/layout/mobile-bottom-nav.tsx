"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavKey = "friends" | "groups" | "activities" | "account";

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "friends", label: "Friends", href: "/dashboard/friends" },
  { key: "groups", label: "Groups", href: "/dashboard/groups" },
  { key: "activities", label: "Activities", href: "/dashboard/activities" },
  { key: "account", label: "Account", href: "/dashboard/account" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (!pathname || !pathname.startsWith("/dashboard")) {
    return null;
  }

  const activeKey: NavKey =
    pathname.startsWith("/dashboard/activities") || pathname.startsWith("/dashboard/trends")
      ? "activities"
      : pathname.startsWith("/dashboard/friends")
        ? "friends"
        : pathname.startsWith("/dashboard/account")
          ? "account"
          : pathname.startsWith("/dashboard/groups") || pathname === "/dashboard"
            ? "groups"
            : "groups";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-stretch justify-between">
        {NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 px-3 py-4 text-sm font-semibold transition ${
                isActive ? "text-emerald-700" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
