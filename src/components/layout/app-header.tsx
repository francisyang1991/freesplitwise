"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTransition } from "react";

export function AppHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const isAuthRoute = pathname?.startsWith("/signin");

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          FreeSplitwise
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {status === "loading" ? null : session?.user ? (
            <>
              <span className="hidden text-sm text-zinc-600 sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    signOut({ callbackUrl: "/" });
                  })
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
              >
                Sign out
              </button>
            </>
          ) : isAuthRoute ? null : (
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  signIn("google", { callbackUrl: "/dashboard" });
                })
              }
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
