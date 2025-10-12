import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    groupId: string;
    membershipId: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteParams) {
  void req;
  const { groupId, membershipId } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      group: {
        select: {
          ownerId: true,
          memberships: {
            select: {
              id: true,
              userId: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const isAppAdmin = session.user.role === "ADMIN";
  const actingMembership = membership.group.memberships.find(
    (entry) => entry.userId === session.user.id,
  );

  const isGroupOwner =
    !!actingMembership && actingMembership.role === "OWNER"
      ? true
      : membership.group.ownerId === session.user.id;

  if (!isAppAdmin && !isGroupOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role === "OWNER") {
    return NextResponse.json(
      { error: "Group owners cannot be removed." },
      { status: 400 },
    );
  }

  const remainingMemberships = membership.group.memberships.filter(
    (entry) => entry.id !== membership.id,
  );

  await prisma.$transaction(async (tx) => {
    await tx.expensePayer.deleteMany({
      where: { membershipId },
    });

    await tx.expenseShare.deleteMany({
      where: { membershipId },
    });

    await tx.membership.delete({
      where: { id: membership.id },
    });

    const expenses = await tx.expense.findMany({
      where: { groupId },
      include: {
        payers: true,
        shares: true,
      },
    });

    for (const expense of expenses) {
      const shares = expense.shares;
      if (shares.length > 0) {
        const total = expense.totalAmountCents;
        const weightSum = shares.reduce((sum, share) => {
          const weight = share.weight && share.weight > 0 ? share.weight : 1;
          return sum + weight;
        }, 0);
        let distributed = 0;
        for (let index = 0; index < shares.length; index += 1) {
          const share = shares[index];
          const weight = share.weight && share.weight > 0 ? share.weight : 1;
          let amount = Math.round((weight / weightSum) * total);
          if (index === shares.length - 1) {
            amount = total - distributed;
          }
          distributed += amount;
          const normalizedAmount = Math.max(amount, 0);
          await tx.expenseShare.update({
            where: { id: share.id },
            data: { amountCents: normalizedAmount },
          });
        }
      }

      let payers = expense.payers;
      if (payers.length === 0) {
        const fallbackMembershipId =
          shares[0]?.membershipId ??
          remainingMemberships[0]?.id ??
          null;
        if (fallbackMembershipId) {
          const created = await tx.expensePayer.create({
            data: {
              expenseId: expense.id,
              membershipId: fallbackMembershipId,
              amountCents: expense.totalAmountCents,
            },
          });
          payers = [created];
        }
      } else {
        const totalPaid = payers.reduce((sum, payer) => sum + payer.amountCents, 0);
        if (totalPaid !== expense.totalAmountCents) {
          if (totalPaid === 0) {
            const fallbackId =
              payers[0]?.membershipId ??
              shares[0]?.membershipId ??
              remainingMemberships[0]?.id ??
              null;
            if (fallbackId) {
              await tx.expensePayer.updateMany({
                where: { expenseId: expense.id },
                data: { amountCents: 0 },
              });
              await tx.expensePayer.update({
                where: { id: payers[0].id },
                data: { membershipId: fallbackId, amountCents: expense.totalAmountCents },
              });
            }
          } else {
            const scale = expense.totalAmountCents / totalPaid;
            let distributed = 0;
            for (let index = 0; index < payers.length; index += 1) {
              const payer = payers[index];
              let amount = Math.round(payer.amountCents * scale);
              if (index === payers.length - 1) {
                amount = expense.totalAmountCents - distributed;
              }
              distributed += amount;
              await tx.expensePayer.update({
                where: { id: payer.id },
                data: { amountCents: amount },
              });
            }
          }
        }
      }
    }
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true }, { status: 200 });
}
