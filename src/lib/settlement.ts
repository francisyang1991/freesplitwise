import type { GroupMemberInfo } from "@/lib/group-serializers";
import type { ExpenseSummary } from "@/lib/expense-serializers";

export type BalanceEntry = {
  membershipId: string;
  netCents: number;
  paidCents: number;
  owedCents: number;
  member: GroupMemberInfo;
};

export type SettlementSuggestion = {
  fromMembershipId: string;
  toMembershipId: string;
  amountCents: number;
  fromMember: GroupMemberInfo;
  toMember: GroupMemberInfo;
  status?: "PENDING" | "REQUESTED" | "PAID" | "CANCELLED";
};

export type SettlementLedger = {
  balances: BalanceEntry[];
  settlements: SettlementSuggestion[];
};

export const computeBalances = (
  expenses: ExpenseSummary[],
  members: GroupMemberInfo[],
): BalanceEntry[] => {
  if (!members || !Array.isArray(members)) {
    return [];
  }
  
  const memberMap = new Map(members.map((member) => [member.membershipId, member]));
  const ledger = new Map<string, { paid: number; owed: number }>();

  members.forEach((member) => {
    ledger.set(member.membershipId, { paid: 0, owed: 0 });
  });

  for (const expense of expenses) {
    for (const payer of expense.payers) {
      const entry = ledger.get(payer.membershipId);
      if (entry) {
        entry.paid += payer.amountCents;
      }
    }
    for (const share of expense.shares) {
      const entry = ledger.get(share.membershipId);
      if (entry) {
        entry.owed += share.amountCents;
      }
    }
  }

  const balances: BalanceEntry[] = [];
  ledger.forEach((totals, membershipId) => {
    const member = memberMap.get(membershipId);
    if (!member) {
      return;
    }
    balances.push({
      membershipId,
      netCents: totals.paid - totals.owed,
      paidCents: totals.paid,
      owedCents: totals.owed,
      member,
    });
  });

  return balances;
};

export const simplifySettlements = (
  balances: BalanceEntry[],
): SettlementSuggestion[] => {
  const debtors = balances
    .filter((entry) => entry.netCents < 0)
    .map((entry) => ({ ...entry }));
  const creditors = balances
    .filter((entry) => entry.netCents > 0)
    .map((entry) => ({ ...entry }));

  debtors.sort((a, b) => a.netCents - b.netCents); // most negative first
  creditors.sort((a, b) => b.netCents - a.netCents); // most positive first

  const settlements: SettlementSuggestion[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = Math.min(creditor.netCents, -debtor.netCents);

    if (amount <= 0) {
      if (debtor.netCents === 0) {
        debtorIndex += 1;
      }
      if (creditor.netCents === 0) {
        creditorIndex += 1;
      }
      continue;
    }

    settlements.push({
      fromMembershipId: debtor.membershipId,
      toMembershipId: creditor.membershipId,
      amountCents: amount,
      fromMember: debtor.member,
      toMember: creditor.member,
    });

    debtor.netCents += amount;
    creditor.netCents -= amount;

    if (Math.abs(debtor.netCents) <= 1) {
      debtor.netCents = 0;
      debtorIndex += 1;
    }
    if (Math.abs(creditor.netCents) <= 1) {
      creditor.netCents = 0;
      creditorIndex += 1;
    }
  }

  return settlements;
};

export const buildSettlementLedger = (
  expenses: ExpenseSummary[],
  members: GroupMemberInfo[],
): SettlementLedger => {
  const balances = computeBalances(expenses, members);
  const settlements = simplifySettlements(balances);
  return { balances, settlements };
};
