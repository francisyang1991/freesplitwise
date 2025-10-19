import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { getMembershipNetBalances } from '@/lib/balances';
import { toGroupSummary } from '@/lib/group-serializers';
import { getServerAuthSession } from '@/lib/auth';

export const loadGroupsSnapshot = cache(async (userId: string) => {
  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId },
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
      createdAt: 'desc',
    },
  });

  const userMemberships = groups.flatMap((group) =>
    group.memberships.filter((membership) => membership.userId === userId),
  );

  const netMap = await getMembershipNetBalances(
    userMemberships.map((membership) => membership.id),
  );

  const groupSummaries = groups.map((group) => {
    const membership = group.memberships.find((entry) => entry.userId === userId);
    const net = membership ? netMap.get(membership.id) ?? 0 : 0;
    return toGroupSummary(group, userId, net);
  });

  return { groupSummaries };
});

export const loadAccountSnapshot = cache(async (userId: string) => {
  const { groupSummaries } = await loadGroupsSnapshot(userId);

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

  return { groupSummaries, balances };
});

export const getAuthedUser = cache(async () => {
  const session = await getServerAuthSession();
  return session ?? null;
});
