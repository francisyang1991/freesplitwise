"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

export function GoogleSignInButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          void signIn("google", { callbackUrl: "/dashboard" });
        })
      }
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isPending}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h6.48c-.28 1.4-1.12 2.59-2.39 3.39v2.82h3.87c2.27-2.09 3.53-5.18 3.53-8.24Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-2.82c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.98H1.26v3.12C3.24 21.3 7.32 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.25 14.45c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.79H1.26A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.26 5.21l4-3.01Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.76 0 3.33.61 4.57 1.8l3.43-3.43C17.96 1.17 15.24 0 12 0 7.32 0 3.24 2.7 1.26 6.79l4 3.12C6.2 6.87 8.86 4.75 12 4.75Z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
