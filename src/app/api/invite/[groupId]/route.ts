import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function POST(_req: NextRequest, context: RouteParams) {
  const { groupId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
  });

  if (existingMembership) {
    return NextResponse.json({ success: true, joined: true }, { status: 200 });
  }

  await prisma.membership.create({
    data: {
      groupId,
      userId: session.user.id,
      role: "MEMBER",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/groups/${groupId}`);

  return NextResponse.json({ success: true, joined: true }, { status: 201 });
}
