import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function joinGroup(code: string, userId: string) {
  console.log(`[joinGroup] Looking for group with invite code: ${code}`);
  
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      inviteCode: true,
    },
  });

  if (!group) {
    console.log(`[joinGroup] No group found with invite code: ${code}`);
    throw new Error("Group not found");
  }

  console.log(`[joinGroup] Found group ${group.id} with invite code: ${code}`);

  const existingMembership = await prisma.membership.findFirst({
    where: {
      groupId: group.id,
      userId: userId,
    },
  });

  if (existingMembership) {
    console.log(`[joinGroup] User ${userId} already a member of group ${group.id}`);
    return { groupId: group.id, alreadyJoined: true };
  }

  console.log(`[joinGroup] Adding user ${userId} to group ${group.id}`);
  await prisma.membership.create({
    data: {
      groupId: group.id,
      userId: userId,
      role: "MEMBER",
    },
  });

  console.log(`[joinGroup] Successfully added user ${userId} to group ${group.id}`);
  return { groupId: group.id, alreadyJoined: false };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  console.log(`[invite] Processing invite code: ${code}`);
  
  const session = await getServerAuthSession();
  if (!session) {
    console.log(`[invite] No session, redirecting to signin`);
    redirect(`/signin?callbackUrl=/invite/${code}`);
  }

  console.log(`[invite] User ${session.user.id} attempting to join with code: ${code}`);

  try {
    const result = await joinGroup(code, session.user.id);
    console.log(`[invite] Successfully joined group ${result.groupId}, alreadyJoined: ${result.alreadyJoined}`);
    redirect(`/dashboard/groups/${result.groupId}`);
  } catch (error) {
    console.error(`[invite] Failed to join group with code ${code}:`, error);
    notFound();
  }
}
