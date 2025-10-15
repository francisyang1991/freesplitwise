import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toGroupMemberInfo } from "@/lib/group-serializers";
import { createGroupFriendships } from "@/lib/friendship";

type RouteParams = {
  params: Promise<{
    groupId: string;
  }>;
};

const normalizeEmail = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeName = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST(req: NextRequest, context: RouteParams) {
  const { groupId } = await context.params;
  const session = await getServerSession(authOptions);

  const body = await req.json().catch(() => null);
  const providedEmail = normalizeEmail(body?.email);
  const providedName = normalizeName(body?.name);

  const wantsBatch = Boolean(body?.generateDummy);
  const batchCountRaw = Number(body?.count ?? 5);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      ownerId: true,
      memberships: {
        select: {
          id: true,
          userId: true,
          role: true,
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = group.memberships.some(
    (membership) => membership.userId === session.user.id && membership.role === "OWNER",
  ) || group.ownerId === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (wantsBatch) {
    const count = Math.min(Math.max(Number.isNaN(batchCountRaw) ? 5 : batchCountRaw, 1), 20);
    const createdMemberships = await prisma.$transaction(async (tx) => {
      const results = [] as ReturnType<typeof toGroupMemberInfo>[];
      for (let i = 0; i < count; i += 1) {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1_000_000);
        const email = `debug-${timestamp}-${randomSuffix}@placeholder.local`;
        const name = `Test Member ${randomSuffix}`;

        const user = await tx.user.create({
          data: {
            email,
            name,
            role: "MEMBER",
          },
        });

        const membership = await tx.membership.create({
          data: {
            groupId,
            userId: user.id,
            role: "MEMBER",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        });

        results.push(toGroupMemberInfo(membership));
      }
      return results;
    });

    // Create friendships for all newly added members
    for (const membership of createdMemberships) {
      await createGroupFriendships(membership.userId, groupId);
    }

    return NextResponse.json({ added: createdMemberships.length, members: createdMemberships }, { status: 201 });
  }

  const email =
    providedEmail ??
    `debug-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@placeholder.local`;
  const name = providedName ?? email.split("@")[0] ?? "Guest";

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        role: "MEMBER",
      },
    });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "User already in group" }, { status: 409 });
  }

  const membership = await prisma.membership.create({
    data: {
      groupId,
      userId: user.id,
      role: "MEMBER",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  // Create friendships with all existing group members
  await createGroupFriendships(user.id, groupId);

  return NextResponse.json(toGroupMemberInfo(membership), { status: 201 });
}
