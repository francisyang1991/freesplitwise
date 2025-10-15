import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGroupFriendships } from "@/lib/friendship";

type RouteParams = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(_req: NextRequest, context: RouteParams) {
  const { code } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      inviteCode: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      groupId: group.id,
      userId: session.user.id,
    },
  });

  if (existingMembership) {
    return NextResponse.json({ success: true, joined: true, groupId: group.id }, { status: 200 });
  }

  await prisma.membership.create({
    data: {
      groupId: group.id,
      userId: session.user.id,
      role: "MEMBER",
    },
  });

  // Create friendships with all existing group members
  await createGroupFriendships(session.user.id, group.id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/groups/${group.id}`);

  return NextResponse.json({ success: true, joined: true, groupId: group.id }, { status: 201 });
}
