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
    orderBy: {
      createdAt: "desc",
    },
  });

  return friendships.map((friendship) => ({
    id: friendship.friend.id,
    name: friendship.friend.name,
    email: friendship.friend.email,
    image: friendship.friend.image,
    friendshipCreatedAt: friendship.createdAt,
  }));
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
