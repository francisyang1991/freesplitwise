import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupsSection } from "@/components/groups/groups-section";
import { toGroupSummary } from "@/lib/group-serializers";
import { getMembershipNetBalances } from "@/lib/balances";

export default async function GroupsPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      memberships: {
        select: {
          id: true,
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const userMemberships = groups.flatMap((group) =>
    group.memberships.filter((membership) => membership.userId === session.user.id),
  );

  const netMap = await getMembershipNetBalances(
    userMemberships.map((membership) => membership.id),
  );

  const groupSummaries = groups.map((group) => {
    const membership = group.memberships.find(
      (entry) => entry.userId === session.user.id,
    );
    const net = membership ? netMap.get(membership.id) ?? 0 : 0;
    return toGroupSummary(group, session.user.id, net);
  });

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Groups</h1>
        <p className="text-sm text-zinc-600">
          Create new groups or manage the ones you are already part of.
        </p>
      </div>
      <GroupsSection initialGroups={groupSummaries} />
    </section>
  );
}
