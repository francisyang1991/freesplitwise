import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  toGroupMemberInfo,
  type GroupMemberInfo,
} from "@/lib/group-serializers";
import { toExpenseSummary } from "@/lib/expense-serializers";
import { buildSettlementLedger } from "@/lib/settlement";

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

  const memberInfos: GroupMemberInfo[] = group.memberships.map((membership) =>
    toGroupMemberInfo(membership),
  );

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
  });

  const expenseSummaries = expenses.map(toExpenseSummary);
  const ledger = buildSettlementLedger(expenseSummaries, memberInfos);

  return NextResponse.json(
    {
      currency: group.currency,
      balances: ledger.balances,
      settlements: ledger.settlements,
    },
    { status: 200 },
  );
}
