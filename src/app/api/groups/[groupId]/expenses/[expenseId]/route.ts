import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExpensePayload } from "../helpers";
import { toExpenseSummary } from "@/lib/expense-serializers";
import { formatCurrency } from "@/lib/currency";

type RouteParams = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteParams) {
  const { groupId, expenseId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      memberships: {
        some: { userId: session.user.id },
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
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const existingExpense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId: group.id,
    },
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
  });

  if (!existingExpense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  let parsed;
  try {
    parsed = parseExpensePayload(body, group.memberships, group.currency);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const existingPayers = existingExpense.payers
    .map((payer) => ({
      membershipId: payer.membershipId,
      amountCents: payer.amountCents,
    }))
    .sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  const newPayers = parsed.payers
    .map((payer) => ({
      membershipId: payer.membershipId,
      amountCents: payer.amountCents,
    }))
    .sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  const payersChanged =
    existingPayers.length !== newPayers.length ||
    existingPayers.some(
      (payer, index) =>
        payer.membershipId !== newPayers[index]?.membershipId ||
        payer.amountCents !== newPayers[index]?.amountCents,
    );

  const previousPayerIds = Array.from(
    new Set(existingPayers.map((payer) => payer.membershipId)),
  );
  const currentPayerIds = Array.from(
    new Set(newPayers.map((payer) => payer.membershipId)),
  );
  const payerCountChanged = previousPayerIds.length !== currentPayerIds.length;
  const payerNameSetChanged =
    payerCountChanged ||
    previousPayerIds.some((id) => !currentPayerIds.includes(id)) ||
    currentPayerIds.some((id) => !previousPayerIds.includes(id));
  const payerAmountsChanged =
    !payerCountChanged &&
    !payerNameSetChanged &&
    existingPayers.some(
      (payer, index) => payer.amountCents !== newPayers[index]?.amountCents,
    );

  const existingShares = existingExpense.shares
    .map((share) => ({
      membershipId: share.membershipId,
      amountCents: share.amountCents,
      weight: share.weight,
    }))
    .sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  const newShares = parsed.shares
    .map((share) => ({
      membershipId: share.membershipId,
      amountCents: share.amountCents,
      weight: share.weight,
    }))
    .sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  const sharesChanged =
    existingShares.length !== newShares.length ||
    existingShares.some((share, index) => {
      const candidate = newShares[index];
      if (!candidate) return true;
      return (
        share.membershipId !== candidate.membershipId ||
        share.amountCents !== candidate.amountCents ||
        share.weight !== candidate.weight
      );
    });

  const previousShareIds = Array.from(
    new Set(existingShares.map((share) => share.membershipId)),
  );
  const currentShareIds = Array.from(
    new Set(newShares.map((share) => share.membershipId)),
  );
  const shareCountChanged = previousShareIds.length !== currentShareIds.length;
  const shareNameSetChanged =
    shareCountChanged ||
    previousShareIds.some((id) => !currentShareIds.includes(id)) ||
    currentShareIds.some((id) => !previousShareIds.includes(id));
  const existingShareMap = new Map(
    existingShares.map((share) => [share.membershipId, share]),
  );
  const newShareMap = new Map(newShares.map((share) => [share.membershipId, share]));
  const shareWeightsChanged =
    !shareNameSetChanged &&
    previousShareIds.some((id) => {
      const prev = existingShareMap.get(id);
      const next = newShareMap.get(id);
      if (!prev || !next) return false;
      return prev.amountCents !== next.amountCents || prev.weight !== next.weight;
    });

  const membershipLookup = new Map(
    group.memberships.map((membership) => [membership.id, membership.user]),
  );

  const resolveMemberName = (membershipId: string) => {
    const user = membershipLookup.get(membershipId);
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Member";
  };

  const describePayers = (
    payers: Array<{
      membershipId: string;
      amountCents: number;
      membership?: {
        user: {
          name: string | null;
          email: string | null;
        } | null;
      } | null;
    }>,
    currency: string,
  ) => {
    if (payers.length === 0) {
      return "n/a";
    }

    const entries = payers.map((payer) => {
      const user =
        payer.membership?.user ?? membershipLookup.get(payer.membershipId) ?? null;
      const name = user?.name ?? user?.email?.split("@")[0] ?? "Member";
      return `${name} (${formatCurrency(payer.amountCents, currency)})`;
    });

    if (entries.length === 1) {
      return entries[0];
    }
    if (entries.length === 2) {
      return `${entries[0]} and ${entries[1]}`;
    }
    return `${entries.slice(0, -1).join(", ")}, and ${entries.at(-1)}`;
  };

  const updatedExpense = await prisma.$transaction(async (tx) => {
    // Record changes for history
    const changes: Record<string, unknown> = {};
    if (existingExpense.description !== parsed.description) {
      changes.description = parsed.description;
    }
    if (existingExpense.totalAmountCents !== parsed.totalAmountCents) {
      changes.totalAmountCents = parsed.totalAmountCents;
    }
    if (existingExpense.currency !== parsed.currency) {
      changes.currency = parsed.currency;
    }
    if (existingExpense.occurredAt.getTime() !== parsed.occurredAt.getTime()) {
      changes.occurredAt = parsed.occurredAt.toISOString();
    }
    if (payersChanged) {
      changes.payers = "updated";
    }
    if (sharesChanged) {
      changes.shares = "updated";
    }

    const expense = await tx.expense.update({
      where: { id: existingExpense.id },
      data: {
        description: parsed.description,
        totalAmountCents: parsed.totalAmountCents,
        currency: parsed.currency,
        occurredAt: parsed.occurredAt,
        payers: {
          deleteMany: {},
          create: parsed.payers.map((payer) => ({
            membershipId: payer.membershipId,
            amountCents: payer.amountCents,
          })),
        },
        shares: {
          deleteMany: {},
          create: parsed.shares.map((share) => ({
            membershipId: share.membershipId,
            weight: share.weight,
            amountCents: share.amountCents,
          })),
        },
      },
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
    });

    // Create history entry if there were changes
    const costChanged =
      existingExpense.totalAmountCents !== parsed.totalAmountCents ||
      existingExpense.currency !== parsed.currency;

    if (Object.keys(changes).length > 0) {
      await tx.expenseHistory.create({
        data: {
          expenseId: existingExpense.id,
          userId: session.user.id,
          action: "updated",
          changes: changes as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      });
    }

    const commentClient =
      (tx as any).expenseComment ?? (prisma as any).expenseComment ?? null;

    if (commentClient?.create) {
      const displayName = session.user.name ?? session.user.email ?? "Someone";

      try {
        if (costChanged) {
          const oldAmount = formatCurrency(
            existingExpense.totalAmountCents,
            existingExpense.currency,
          );
          const newAmount = formatCurrency(parsed.totalAmountCents, parsed.currency);
          await commentClient.create({
            data: {
              expenseId: existingExpense.id,
              authorName: "SplitNinja",
              body: `${displayName} updated cost from ${oldAmount} to ${newAmount}`,
            },
          });
        }

        if (payerCountChanged || payerNameSetChanged) {
          const previous = describePayers(
            existingExpense.payers.map((payer) => ({
              membershipId: payer.membershipId,
              amountCents: payer.amountCents,
              membership: payer.membership,
            })),
            existingExpense.currency,
          );
          const current = describePayers(
            expense.payers.map((payer) => ({
              membershipId: payer.membershipId,
              amountCents: payer.amountCents,
              membership: payer.membership,
            })),
            expense.currency,
          );

          const removed = previousPayerIds
            .filter((id) => !currentPayerIds.includes(id))
            .map((id) => membershipLookup.get(id))
            .filter(Boolean)
            .map((member) => member?.name ?? member?.email ?? "Member");
          const added = currentPayerIds
            .filter((id) => !previousPayerIds.includes(id))
            .map((id) => membershipLookup.get(id))
            .filter(Boolean)
            .map((member) => member?.name ?? member?.email ?? "Member");

          let detail = "";
          if (removed.length > 0) {
            detail += ` Removed: ${removed.join(", ")}.`;
          }
          if (added.length > 0) {
            detail += ` Added: ${added.join(", ")}.`;
          }
          if (!detail && payerAmountsChanged) {
            detail = " Amount split updated.";
          }

          const detailText = detail.trim();

          await commentClient.create({
            data: {
              expenseId: existingExpense.id,
              authorName: "SplitNinja",
              body: detailText
                ? `Payer changed from ${previous} to ${current}. ${detailText}`
                : `Payer changed from ${previous} to ${current}`,
            },
          });
        }

        if (shareCountChanged || shareNameSetChanged || shareWeightsChanged) {
          const removedShares = previousShareIds
            .filter((id) => !currentShareIds.includes(id))
            .map(resolveMemberName);
          const addedShares = currentShareIds
            .filter((id) => !previousShareIds.includes(id))
            .map(resolveMemberName);

          const adjustedShares: string[] = [];
          if (!shareNameSetChanged && shareWeightsChanged) {
            previousShareIds.forEach((id) => {
              const prev = existingShareMap.get(id);
              const next = newShareMap.get(id);
              if (!prev || !next) return;
              if (prev.amountCents !== next.amountCents || prev.weight !== next.weight) {
                const name = resolveMemberName(id);
                adjustedShares.push(
                  `${name} (${formatCurrency(prev.amountCents, existingExpense.currency)} → ${formatCurrency(next.amountCents, expense.currency)})`,
                );
              }
            });
          }

          const shareDetails: string[] = [];
          if (removedShares.length > 0) {
            shareDetails.push(`Removed: ${removedShares.join(", ")}.`);
          }
          if (addedShares.length > 0) {
            shareDetails.push(`Added: ${addedShares.join(", ")}.`);
          }
          if (adjustedShares.length > 0) {
            shareDetails.push(`Amounts adjusted: ${adjustedShares.join(", ")}.`);
          }

          const shareBody = shareDetails.length > 0
            ? `Split participants updated. ${shareDetails.join(" ")}`
            : "Split participants updated.";

          await commentClient.create({
            data: {
              expenseId: existingExpense.id,
              authorName: "SplitNinja",
              body: shareBody,
            },
          });
        }
      } catch (commentError) {
        console.warn("Failed to create automated expense comment", commentError);
      }
    } else {
      console.warn("ExpenseComment model unavailable; skipping automated comment.");
    }

    return expense;
  });

  return NextResponse.json(toExpenseSummary(updatedExpense), { status: 200 });
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  const { groupId, expenseId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId,
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Create history entry for deletion
    await tx.expenseHistory.create({
      data: {
        expenseId: expense.id,
        userId: session.user.id,
        action: "deleted",
        changes: {
          description: expense.description,
          totalAmountCents: expense.totalAmountCents,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    // Delete the expense
    await tx.expense.delete({ where: { id: expenseId } });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
