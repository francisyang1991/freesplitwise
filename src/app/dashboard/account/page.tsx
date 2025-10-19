export const revalidate = 10;

import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/account-panel";
import { getAuthedUser, loadAccountSnapshot } from "@/lib/dashboard-server";
import { formatCurrency } from "@/lib/currency";

export default async function AccountPage() {
  const session = await getAuthedUser();
  if (!session) {
    redirect("/signin");
  }
  const { groupSummaries, balances } = await loadAccountSnapshot(session.user.id);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Account</h1>
        <p className="text-sm text-zinc-600">
          Review your profile details and where you stand across all groups.
        </p>
      </div>
      <AccountPanel user={session.user} balances={balances} />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Group balances</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Positive amounts mean your friends owe you. Negative amounts mean you owe them.
        </p>
        {groupSummaries.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">You are not part of any groups yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-zinc-100">
            {groupSummaries.map((group) => {
              const net = group.netBalanceCents ?? 0;
              const amountClass =
                net > 0
                  ? "text-emerald-600"
                  : net < 0
                    ? "text-rose-600"
                    : "text-zinc-500";
              return (
                <li
                  key={group.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-900">{group.name}</span>
                    <span className="text-xs text-zinc-500">{group.currency}</span>
                  </div>
                  <span className={`font-semibold ${amountClass}`}>
                    {formatCurrency(net, group.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
