import { formatCurrency } from "@/lib/currency";
import type { BalanceEntry, SettlementSuggestion } from "@/lib/settlement";
import type { GroupMemberInfo } from "@/lib/group-serializers";

type Props = {
  currency: string;
  balances: BalanceEntry[];
  settlements: SettlementSuggestion[];
  currentUserId: string;
  currentMember: GroupMemberInfo | null;
};

const nameForMember = (member: GroupMemberInfo) => {
  return member.name ?? member.email ?? "Member";
};

export function GroupBalanceOverview({
  currency,
  balances,
  settlements,
  currentUserId,
  currentMember,
}: Props) {
  if (!currentMember) {
    return null;
  }

  const currentBalance = balances.find(
    (balance) => balance.member.userId === currentUserId,
  );

  if (!currentBalance) {
    return null;
  }

  const net = currentBalance.netCents;
  const isCreditor = net > 0;
  const isDebtor = net < 0;

  const headline = isCreditor
    ? `You are owed ${formatCurrency(Math.abs(net), currency)} overall`
    : isDebtor
    ? `You owe ${formatCurrency(Math.abs(net), currency)} overall`
    : "You're all settled up";

  const breakdown = settlements.filter((settlement) =>
    isCreditor
      ? settlement.toMembershipId === currentBalance.membershipId
      : settlement.fromMembershipId === currentBalance.membershipId,
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Balance summary
        </p>
        <h2 className="text-2xl font-semibold text-zinc-900">{headline}</h2>
        <p className="text-sm text-zinc-600">
          {isCreditor
            ? "Friends owe you money based on the current splits."
            : isDebtor
            ? "You owe the group for recent expenses."
            : "No outstanding balances right now."}
        </p>
      </div>

      {breakdown.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {breakdown.map((settlement) => (
            <li
              key={`${settlement.fromMembershipId}-${settlement.toMembershipId}`}
              className="flex items-center justify-between"
            >
              <span className="text-zinc-600">
                {isCreditor
                  ? `${nameForMember(settlement.fromMember)} owes you`
                  : `You owe ${nameForMember(settlement.toMember)}`}
              </span>
              <span
                className={`font-semibold ${
                  isCreditor ? "text-emerald-600" : "text-orange-600"
                }`}
              >
                {formatCurrency(settlement.amountCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
