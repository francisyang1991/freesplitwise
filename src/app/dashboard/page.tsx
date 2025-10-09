import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GroupsSection } from "@/components/groups/groups-section";
import { toGroupSummary } from "@/lib/group-serializers";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id },
      },
    },
    include: {
      memberships: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const groupSummaries = groups.map((group) =>
    toGroupSummary(group, session.user.id),
  );

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Welcome back, {session.user.name ?? "friend"}!
        </h1>
        <p className="text-sm text-zinc-600">
          Create groups, track expenses, and settle balances with your crew.
        </p>
      </div>
      <GroupsSection initialGroups={groupSummaries} />
    </section>
  );
}
