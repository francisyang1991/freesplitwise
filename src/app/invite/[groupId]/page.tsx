import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteJoinCard } from "@/components/invite/invite-join-card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/signin?callbackUrl=/invite/${groupId}`);
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: { memberships: true },
      },
      memberships: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!group) {
    notFound();
  }

  if (group.memberships.length > 0) {
    redirect(`/dashboard/groups/${group.id}`);
  }

  const ownerName = group.owner?.name ?? group.owner?.email ?? "Group owner";

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 py-12">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          SplitNinja invite
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Join {group.name}
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {ownerName} invited you to collaborate on expenses. Join the group to log purchases,
          split costs, and settle balances together.
        </p>
      </div>
      <InviteJoinCard
        groupId={group.id}
        groupName={group.name}
        memberCount={group._count.memberships}
        ownerName={ownerName}
      />
    </section>
  );
}
