import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
        },
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

  await prisma.membership.create({
    data: {
      groupId: group.id,
      userId: session.user.id,
      role: "MEMBER",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/groups/${group.id}`);

  redirect(`/dashboard/groups/${group.id}`);
}
