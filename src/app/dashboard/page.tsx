import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GroupsSection } from "@/components/groups/groups-section";
import { toGroupSummary } from "@/lib/group-serializers";
import { getMembershipNetBalances } from "@/lib/balances";
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import { AdminFeedbackPanel } from "@/components/feedback/admin-feedback-panel";
import { CompanyInfoCard } from "@/components/company/company-info";
import { FriendsPanel } from "@/components/friends/friends-panel";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const isAdmin = session.user.role === "ADMIN";

  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id },
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

  const feedbackEntries = isAdmin
    ? await prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    : [];

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900 leading-tight">
          <span className="block">Welcome.</span>
          <span className="block text-emerald-700">
            {session.user.name ?? "friend"}
          </span>
        </h1>
        <p className="text-sm text-zinc-600">
          Create groups, track expenses, and settle balances with your crew.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GroupsSection initialGroups={groupSummaries} />
        <div className="flex flex-col gap-6">
          <FriendsPanel />
          <FeedbackPanel />
          {isAdmin ? <AdminFeedbackPanel entries={feedbackEntries} /> : null}
          <CompanyInfoCard />
        </div>
      </div>
    </section>
  );
}
