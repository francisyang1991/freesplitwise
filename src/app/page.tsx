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
          No fees, no spreadsheets
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          SplitNinja makes shared spending painless.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600">
          Track tabs, capture who paid, and send everyone home square. SplitNinja keeps group expenses organised, fair, and fast so you can focus on the fun instead of the math.
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
            title: "Instant Google sign-in",
            body:
              "Jump into trips, squads, or households in seconds—no passwords to juggle or invites to chase.",
          },
          {
            title: "Flexible splits",
            body:
              "Log expenses from any combination of payers and quickly fine-tune weighted shares for each friend.",
          },
          {
            title: "Smart settlements",
            body:
              "Let SplitNinja suggest the smallest set of repayments so everyone settles up with fewer transfers.",
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
