import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExpensePayload } from "../helpers";
import { toExpenseSummary } from "@/lib/expense-serializers";

type RouteParams = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteParams) {
  const { groupId, expenseId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      memberships: {
        some: { userId: session.user.id },
      },
    },
    include: {
      memberships: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const existingExpense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId: group.id,
    },
  });

  if (!existingExpense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  let parsed;
  try {
    parsed = parseExpensePayload(body, group.memberships, group.currency);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const updatedExpense = await prisma.$transaction(async (tx) => {
    // Record changes for history
    const changes: Record<string, unknown> = {};
    if (existingExpense.description !== parsed.description) {
      changes.description = parsed.description;
    }
    if (existingExpense.totalAmountCents !== parsed.totalAmountCents) {
      changes.totalAmountCents = parsed.totalAmountCents;
    }
    if (existingExpense.currency !== parsed.currency) {
      changes.currency = parsed.currency;
    }

    const expense = await tx.expense.update({
      where: { id: existingExpense.id },
      data: {
        description: parsed.description,
        totalAmountCents: parsed.totalAmountCents,
        currency: parsed.currency,
        occurredAt: parsed.occurredAt,
        payers: {
          deleteMany: {},
          create: parsed.payers.map((payer) => ({
            membershipId: payer.membershipId,
            amountCents: payer.amountCents,
          })),
        },
        shares: {
          deleteMany: {},
          create: parsed.shares.map((share) => ({
            membershipId: share.membershipId,
            weight: share.weight,
            amountCents: share.amountCents,
          })),
        },
      },
      include: {
        payers: {
          include: {
            membership: {
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
            },
          },
        },
        shares: {
          include: {
            membership: {
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
            },
          },
        },
      },
    });

    // Create history entry if there were changes
    if (Object.keys(changes).length > 0) {
      await tx.expenseHistory.create({
        data: {
          expenseId: existingExpense.id,
          userId: session.user.id,
          action: "updated",
          changes: changes as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      });
    }

    return expense;
  });

  return NextResponse.json(toExpenseSummary(updatedExpense), { status: 200 });
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  const { groupId, expenseId } = await context.params;
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId,
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Create history entry for deletion
    await tx.expenseHistory.create({
      data: {
        expenseId: expense.id,
        userId: session.user.id,
        action: "deleted",
        changes: {
          description: expense.description,
          totalAmountCents: expense.totalAmountCents,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    // Delete the expense
    await tx.expense.delete({ where: { id: expenseId } });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
