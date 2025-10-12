import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, expenseId } = await params;

    // Verify user is member of the group
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Get expense history
    const history = await prisma.expenseHistory.findMany({
      where: {
        expenseId,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching expense history:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense history" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, expenseId } = await params;
    const { action, changes } = await request.json();

    // Verify user is member of the group
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Create history entry
    const historyEntry = await prisma.expenseHistory.create({
      data: {
        expenseId,
        userId: session.user.id,
        action,
        changes: (changes || null) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

    return NextResponse.json({ historyEntry });
  } catch (error) {
    console.error("Error creating expense history:", error);
    return NextResponse.json(
      { error: "Failed to create expense history" },
      { status: 500 }
    );
  }
}
