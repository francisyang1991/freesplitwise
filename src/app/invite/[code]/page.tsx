import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function joinGroup(code: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      inviteCode: true,
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      groupId: group.id,
      userId: userId,
    },
  });

  if (existingMembership) {
    return { groupId: group.id, alreadyJoined: true };
  }

  await prisma.membership.create({
    data: {
      groupId: group.id,
      userId: userId,
      role: "MEMBER",
    },
  });

  return { groupId: group.id, alreadyJoined: false };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/signin?callbackUrl=/invite/${code}`);
  }

  try {
    const result = await joinGroup(code, session.user.id);
    redirect(`/dashboard/groups/${result.groupId}`);
  } catch (error) {
    notFound();
  }
}
