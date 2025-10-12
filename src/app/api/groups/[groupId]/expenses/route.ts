import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toExpenseSummary } from "@/lib/expense-serializers";
import { parseExpensePayload } from "./helpers";

type RouteParams = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteParams) {
  const { groupId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
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

  const isMember = group.memberships.some(
    (membership) => membership.userId === session.user.id,
  );

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id },
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
    orderBy: {
      occurredAt: "desc",
    },
  });

  const payload = expenses.map(toExpenseSummary);
  return NextResponse.json(payload, { status: 200 });
}

export async function POST(req: NextRequest, context: RouteParams) {
  const { groupId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
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

  const isMember = group.memberships.some(
    (membership) => membership.userId === session.user.id,
  );

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  let parsed;
  try {
    parsed = parseExpensePayload(body, group.memberships, group.currency);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      createdById: session.user.id,
      description: parsed.description,
      totalAmountCents: parsed.totalAmountCents,
      currency: parsed.currency,
      occurredAt: parsed.occurredAt,
      payers: {
        create: parsed.payers.map((payer) => ({
          membershipId: payer.membershipId,
          amountCents: payer.amountCents,
        })),
      },
      shares: {
        create: parsed.shares.map((share) => ({
          membershipId: share.membershipId,
          weight: share.weight,
          amountCents: share.amountCents,
        })),
      },
      history: {
        create: {
          userId: session.user.id,
          action: "created",
          changes: {
            description: parsed.description,
            totalAmountCents: parsed.totalAmountCents,
            currency: parsed.currency,
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
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

  return NextResponse.json(toExpenseSummary(expense), { status: 201 });
}
