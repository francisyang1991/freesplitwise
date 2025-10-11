import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { APP_URL } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { GroupExpensesSection } from "@/components/groups/group-expenses-section";
import { GroupSettlementsPanel } from "@/components/groups/group-settlements-panel";
import { GroupSettings } from "@/components/groups/group-settings";
import { GroupBalanceOverview } from "@/components/groups/group-balance-overview";
import {
  toGroupMemberInfo,
  type GroupMemberInfo,
} from "@/lib/group-serializers";
import { toExpenseSummary } from "@/lib/expense-serializers";
import { buildSettlementLedger } from "@/lib/settlement";

type GroupPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params;
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      memberships: {
        some: {
          userId: session.user.id,
        },
      },
    },
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
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const owner = group.memberships.find((m) => m.userId === group.ownerId);
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
    orderBy: {
      occurredAt: "desc",
    },
  });

  const expenseSummaries = expenses.map(toExpenseSummary);
  const settlementLedger = buildSettlementLedger(expenseSummaries, memberInfos);
  const isAdmin = session.user.role === "ADMIN";
  const currentMember = memberInfos.find(
    (member) => member.userId === session.user.id,
  ) ?? null;
  const canRemoveMembers = isAdmin || currentMember?.role === "OWNER";
  const inviteLink = `${APP_URL}/invite/${group.id}`;
  const canDelete = isAdmin || group.ownerId === session.user.id;
  const canLeave = group.ownerId !== session.user.id;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Group
            </p>
            <h1 className="text-3xl font-semibold text-zinc-900">{group.name}</h1>
            {group.description ? (
              <p className="text-sm text-zinc-600">{group.description}</p>
            ) : (
              <p className="text-sm text-zinc-400">No description provided.</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-zinc-500">
              <span>Currency: {group.currency}</span>
              <span>Members: {group.memberships.length}</span>
              {owner ? <span>Owner: {owner.user?.name ?? "Unknown"}</span> : null}
            </div>
          </div>
          <GroupSettings
            groupId={group.id}
            members={memberInfos}
            isAdmin={isAdmin}
            canDelete={canDelete}
            canLeave={canLeave}
            inviteLink={inviteLink}
            canRemoveMembers={canRemoveMembers}
            currentMembershipId={currentMember?.membershipId ?? null}
          />
        </div>
      </div>

      <GroupBalanceOverview
        groupId={group.id}
        currency={group.currency}
        balances={settlementLedger.balances}
        settlements={settlementLedger.settlements}
        currentUserId={session.user.id}
        currentMember={currentMember}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GroupExpensesSection
          groupId={group.id}
          currency={group.currency}
          members={memberInfos}
          initialExpenses={expenseSummaries}
          currentMember={currentMember}
        />
        <aside className="flex flex-col gap-6">
          <GroupSettlementsPanel
            groupId={group.id}
            currency={group.currency}
            balances={settlementLedger.balances}
            settlements={settlementLedger.settlements}
            currentMemberId={currentMember?.membershipId ?? null}
          />
        </aside>
      </div>
    </section>
  );
}
