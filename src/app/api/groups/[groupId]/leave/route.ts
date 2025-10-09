import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteParams) {
  const { groupId } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (membership.role === "OWNER") {
    return NextResponse.json(
      { error: "Owners must transfer ownership before leaving" },
      { status: 400 },
    );
  }

  await prisma.membership.delete({ where: { id: membership.id } });

  return NextResponse.json({ success: true }, { status: 200 });
}
