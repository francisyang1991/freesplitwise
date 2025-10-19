import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserActivityList, type UserActivityEntry } from "@/components/activities/user-activity-list";

export default async function ActivitiesPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const expenses = await prisma.expense.findMany({
    where: {
      group: {
        memberships: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      payers: {
        select: {
          id: true,
          membershipId: true,
          amountCents: true,
          membership: {
            select: {
              userId: true,
            },
          },
        },
      },
      shares: {
        select: {
          id: true,
          membershipId: true,
          amountCents: true,
          membership: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: 25,
  });

  const activities: UserActivityEntry[] = expenses
    .map((expense) => {
      const userPaidCents = expense.payers
        .filter((payer) => payer.membership?.userId === session.user.id)
        .reduce((total, payer) => total + payer.amountCents, 0);

      const userShareCents = expense.shares
        .filter((share) => share.membership?.userId === session.user.id)
        .reduce((total, share) => total + share.amountCents, 0);

      if (userPaidCents === 0 && userShareCents === 0) {
        return null;
      }

      return {
        id: expense.id,
        groupId: expense.group.id,
        description: expense.description,
        occurredAt: expense.occurredAt.toISOString(),
        currency: expense.group.currency,
        totalAmountCents: expense.totalAmountCents,
        groupName: expense.group.name,
        userPaidCents,
        userShareCents,
      };
    })
    .filter((entry): entry is UserActivityEntry => entry !== null);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Activity</h1>
        <p className="text-sm text-zinc-600">
          Recent expenses involving you, across every group you joined.
        </p>
      </div>
      <UserActivityList activities={activities} />
    </section>
  );
}
