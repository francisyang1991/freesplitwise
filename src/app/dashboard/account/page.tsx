import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountPanel } from "@/components/account/account-panel";
import { toGroupSummary } from "@/lib/group-serializers";
import { getMembershipNetBalances } from "@/lib/balances";
import { formatCurrency } from "@/lib/currency";

export default async function AccountPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id },
      },
    },
    include: {
      memberships: {
        select: {
          id: true,
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const userMemberships = groups.flatMap((group) =>
    group.memberships.filter((membership) => membership.userId === session.user.id),
  );

  const netMap = await getMembershipNetBalances(
    userMemberships.map((membership) => membership.id),
  );

  const groupSummaries = groups.map((group) => {
    const membership = group.memberships.find(
      (entry) => entry.userId === session.user.id,
    );
    const net = membership ? netMap.get(membership.id) ?? 0 : 0;
    return toGroupSummary(group, session.user.id, net);
  });

  const balanceByCurrency = new Map<string, number>();
  for (const summary of groupSummaries) {
    const net = summary.netBalanceCents ?? 0;
    balanceByCurrency.set(
      summary.currency,
      (balanceByCurrency.get(summary.currency) ?? 0) + net,
    );
  }

  const balances = Array.from(balanceByCurrency.entries()).map(
    ([currency, amountCents]) => ({
      currency,
      amountCents,
    }),
  );

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
