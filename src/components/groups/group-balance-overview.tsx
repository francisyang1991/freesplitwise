"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import type { BalanceEntry, SettlementSuggestion } from "@/lib/settlement";
import type { GroupMemberInfo } from "@/lib/group-serializers";

type Props = {
  groupId: string;
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
  groupId,
  currency,
  balances,
  settlements,
  currentUserId,
  currentMember,
}: Props) {
  const [ledgerBalances, setLedgerBalances] = useState<BalanceEntry[]>(balances);
  const [ledgerSettlements, setLedgerSettlements] =
    useState<SettlementSuggestion[]>(settlements);

  useEffect(() => {
    setLedgerBalances(balances);
    setLedgerSettlements(settlements);
  }, [balances, settlements]);

  const refreshLedger = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/settlements`);
      if (!response.ok) {
        throw new Error("Failed to refresh balance overview");
      }
      const payload = await response.json();
      setLedgerBalances(payload.balances ?? []);
      setLedgerSettlements(payload.settlements ?? []);
    } catch (error) {
      console.error("Unable to refresh balance overview", error);
    }
  }, [groupId]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object" &&
        "groupId" in event.detail &&
        event.detail.groupId === groupId
      ) {
        void refreshLedger();
      }
    };

    window.addEventListener("group:expenses-updated", handler);
    return () => {
      window.removeEventListener("group:expenses-updated", handler);
    };
  }, [groupId, refreshLedger]);

  const currentBalance = useMemo(() => {
    return (
      ledgerBalances.find(
        (balance) => balance.member.userId === currentUserId,
      ) ?? null
    );
  }, [ledgerBalances, currentUserId]);

  const net = currentBalance?.netCents ?? 0;
  const isCreditor = net > 0;
  const isDebtor = net < 0;

  const breakdown = useMemo(() => {
    if (!currentBalance) return [];
    if (!isCreditor && !isDebtor) return [];
    return ledgerSettlements.filter((settlement) =>
      isCreditor
        ? settlement.toMembershipId === currentBalance.membershipId
        : settlement.fromMembershipId === currentBalance.membershipId,
    );
  }, [currentBalance, isCreditor, isDebtor, ledgerSettlements]);

  if (!currentMember || !currentBalance) {
    return null;
  }

  const headline = isCreditor
    ? `You are owed ${formatCurrency(Math.abs(net), currency)} overall`
    : isDebtor
    ? `You owe ${formatCurrency(Math.abs(net), currency)} overall`
    : "You're all settled up";

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
