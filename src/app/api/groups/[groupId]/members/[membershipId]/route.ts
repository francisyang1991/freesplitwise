import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    groupId: string;
    membershipId: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteParams) {
  void req;
  const { groupId, membershipId } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      group: {
        select: {
          ownerId: true,
          memberships: {
            select: {
              id: true,
              userId: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const isAppAdmin = session.user.role === "ADMIN";
  const actingMembership = membership.group.memberships.find(
    (entry) => entry.userId === session.user.id,
  );

  const isGroupOwner =
    !!actingMembership && actingMembership.role === "OWNER"
      ? true
      : membership.group.ownerId === session.user.id;

  if (!isAppAdmin && !isGroupOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role === "OWNER") {
    return NextResponse.json(
      { error: "Group owners cannot be removed." },
      { status: 400 },
    );
  }

  await prisma.membership.delete({
    where: { id: membership.id },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
