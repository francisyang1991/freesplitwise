import { prisma } from "@/lib/prisma";

export const getMembershipNetBalances = async (membershipIds: string[]) => {
  const uniqueIds = Array.from(new Set(membershipIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, number>();

  const [payerGroups, shareGroups] = await Promise.all([
    prisma.expensePayer.groupBy({
      by: ["membershipId"],
      where: {
        membershipId: { in: uniqueIds },
      },
      _sum: {
        amountCents: true,
      },
    }),
    prisma.expenseShare.groupBy({
      by: ["membershipId"],
      where: {
        membershipId: { in: uniqueIds },
      },
      _sum: {
        amountCents: true,
      },
    }),
  ]);

  const netMap = new Map<string, number>();
  uniqueIds.forEach((id) => netMap.set(id, 0));

  payerGroups.forEach((entry) => {
    const current = netMap.get(entry.membershipId) ?? 0;
    netMap.set(entry.membershipId, current + (entry._sum.amountCents ?? 0));
  });

  shareGroups.forEach((entry) => {
    const current = netMap.get(entry.membershipId) ?? 0;
    netMap.set(entry.membershipId, current - (entry._sum.amountCents ?? 0));
  });

  return netMap;
};
