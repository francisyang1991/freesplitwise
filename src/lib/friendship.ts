import { getMembershipNetBalances } from "./balances";
import { prisma } from "./prisma";

/**
 * Creates friendships between a user and all members of a group
 * This is called when a user joins a group to automatically make them friends
 */
export async function createGroupFriendships(userId: string, groupId: string) {
  try {
    // Get all members of the group
    const groupMembers = await prisma.membership.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create friendships between the new user and all existing members
    const friendshipPromises = groupMembers
      .filter((member) => member.userId !== userId) // Don't create friendship with self
      .map((member) =>
        prisma.friendship.upsert({
          where: {
            userId_friendId: {
              userId,
              friendId: member.userId,
            },
          },
          update: {}, // No update needed if friendship already exists
          create: {
            userId,
            friendId: member.userId,
          },
        })
      );

    // Also create reverse friendships (bidirectional)
    const reverseFriendshipPromises = groupMembers
      .filter((member) => member.userId !== userId)
      .map((member) =>
        prisma.friendship.upsert({
          where: {
            userId_friendId: {
              userId: member.userId,
              friendId: userId,
            },
          },
          update: {}, // No update needed if friendship already exists
          create: {
            userId: member.userId,
            friendId: userId,
          },
        })
      );

    await Promise.all([...friendshipPromises, ...reverseFriendshipPromises]);

    console.log(`Created friendships for user ${userId} with ${groupMembers.length - 1} group members`);
  } catch (error) {
    console.error("Error creating group friendships:", error);
    // Don't throw error - friendship creation shouldn't block group joining
  }
}

/**
 * Gets all friends of a user
 */
export async function getUserFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    include: {
      friend: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (friendships.length === 0) {
    return [];
  }

  const friendIds = friendships.map((friendship) => friendship.friendId);
  const friendIdSet = new Set(friendIds);

  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId },
      },
    },
    select: {
      id: true,
      currency: true,
      memberships: {
        where: {
          userId: {
            in: [userId, ...friendIds],
          },
        },
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  const membershipIds = groups.flatMap((group) =>
    group.memberships.map((membership) => membership.id),
  );
  const netMap = await getMembershipNetBalances(membershipIds);

  const friendBalances = new Map<string, Map<string, number>>();

  for (const group of groups) {
    const userMembership = group.memberships.find(
      (membership) => membership.userId === userId,
    );

    if (!userMembership) {
      continue;
    }

    const userNet = netMap.get(userMembership.id) ?? 0;
    if (userNet === 0) {
      continue;
    }

    if (userNet > 0) {
      let remaining = userNet;
      const debtors = group.memberships
        .filter((membership) => membership.userId !== userId)
        .map((membership) => ({
          membership,
          net: netMap.get(membership.id) ?? 0,
        }))
        .filter((entry) => entry.net < 0)
        .sort((a, b) => a.net - b.net);

      for (const { membership, net } of debtors) {
        if (remaining <= 0) {
          break;
        }

        const contribution = Math.min(remaining, Math.abs(net));
        if (contribution <= 0) {
          continue;
        }

        if (friendIdSet.has(membership.userId)) {
          const balanceByCurrency =
            friendBalances.get(membership.userId) ?? new Map<string, number>();
          balanceByCurrency.set(
            group.currency,
            (balanceByCurrency.get(group.currency) ?? 0) + contribution,
          );
          friendBalances.set(membership.userId, balanceByCurrency);
        }

        remaining -= contribution;
      }
    } else {
      let remaining = Math.abs(userNet);
      const creditors = group.memberships
        .filter((membership) => membership.userId !== userId)
        .map((membership) => ({
          membership,
          net: netMap.get(membership.id) ?? 0,
        }))
        .filter((entry) => entry.net > 0)
        .sort((a, b) => b.net - a.net);

      for (const { membership, net } of creditors) {
        if (remaining <= 0) {
          break;
        }

        const contribution = Math.min(remaining, net);
        if (contribution <= 0) {
          continue;
        }

        if (friendIdSet.has(membership.userId)) {
          const balanceByCurrency =
            friendBalances.get(membership.userId) ?? new Map<string, number>();
          balanceByCurrency.set(
            group.currency,
            (balanceByCurrency.get(group.currency) ?? 0) - contribution,
          );
          friendBalances.set(membership.userId, balanceByCurrency);
        }

        remaining -= contribution;
      }
    }
  }

  const friends = friendships.map((friendship) => {
    const balanceByCurrency =
      friendBalances.get(friendship.friendId) ?? new Map<string, number>();
    const balances = Array.from(balanceByCurrency.entries())
      .map(([currency, amountCents]) => ({
        currency,
        amountCents,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));

    return {
      id: friendship.friend.id,
      name: friendship.friend.name,
      email: friendship.friend.email,
      image: friendship.friend.image,
      friendshipCreatedAt: friendship.createdAt,
      balances,
    };
  });

  friends.sort((a, b) => {
    const aHasBalance = a.balances.some((balance) => balance.amountCents !== 0);
    const bHasBalance = b.balances.some((balance) => balance.amountCents !== 0);

    if (aHasBalance !== bHasBalance) {
      return aHasBalance ? -1 : 1;
    }

    const nameA = (a.name ?? a.email ?? a.id).toLowerCase();
    const nameB = (b.name ?? b.email ?? b.id).toLowerCase();

    return nameA.localeCompare(nameB);
  });

  return friends;
}

/**
 * Checks if two users are friends
 */
export async function areUsersFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findUnique({
    where: {
      userId_friendId: {
        userId: userId1,
        friendId: userId2,
      },
    },
  });

  return !!friendship;
}

/**
 * Removes friendship between two users
 */
export async function removeFriendship(userId: string, friendId: string) {
  await prisma.$transaction([
    // Remove friendship in both directions
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    }),
  ]);
}
