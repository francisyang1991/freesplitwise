import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getServerAuthSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-12 py-10">
      <div className="grid gap-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Free, forever
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Split group expenses without the friction.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600">
          FreeSplitwise helps your crew log purchases, weight shares by person,
          and settle up with fewer payments. Sign in with Google and get started
          in seconds.
        </p>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Sign in with Google
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-base font-semibold text-zinc-700 transition hover:bg-white"
          >
            Explore features
          </Link>
        </div>
      </div>
      <div
        id="features"
        className="grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-3"
      >
        {[
          {
            title: "Google sign-in",
            body:
              "Use your Google account to skip password management and jump straight into your groups.",
          },
          {
            title: "Flexible expenses",
            body:
              "Log payments from multiple people and weight shares individually for each expense.",
          },
          {
            title: "Smart settlements",
            body:
              "We suggest the minimal payments to settle balances quickly without mental math.",
          },
        ].map((feature) => (
          <div key={feature.title} className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-600">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
