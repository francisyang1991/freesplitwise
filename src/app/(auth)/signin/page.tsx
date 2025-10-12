import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getServerAuthSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

export default async function SignInPage() {
  const session = await getServerAuthSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Sign in to SplitNinja
        </h1>
        <p className="text-sm text-zinc-600">
          Use your Google account to access existing groups or start a new one.
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <GoogleSignInButton />
      </Suspense>
      <p className="text-center text-xs text-zinc-500">
        By signing in, you agree to our{" "}
        <Link href="#" className="underline underline-offset-4">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
