import type {
  Expense,
  ExpensePayer,
  ExpenseShare,
  Membership,
  User,
} from "@prisma/client";

type MembershipWithUser = Membership & {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
};

export type ExpensePayerSummary = {
  id: string;
  membershipId: string;
  amountCents: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export type ExpenseShareSummary = {
  id: string;
  membershipId: string;
  weight: number;
  amountCents: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export type ExpenseSummary = {
  id: string;
  groupId: string;
  description: string;
  totalAmountCents: number;
  currency: string;
  occurredAt: string;
  createdAt: string;
  payers: ExpensePayerSummary[];
  shares: ExpenseShareSummary[];
};

type ExpenseWithRelations = Expense & {
  payers: (ExpensePayer & { membership: MembershipWithUser })[];
  shares: (ExpenseShare & { membership: MembershipWithUser })[];
};

const serializeMembershipUser = (membership: MembershipWithUser) => {
  if (!membership.user) {
    return null;
  }

  return {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    image: membership.user.image,
  };
};

export const toExpenseSummary = (
  expense: ExpenseWithRelations,
): ExpenseSummary => {
  return {
    id: expense.id,
    groupId: expense.groupId,
    description: expense.description,
    totalAmountCents: expense.totalAmountCents,
    currency: expense.currency,
    occurredAt: expense.occurredAt.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    payers: expense.payers.map((payer) => ({
      id: payer.id,
      membershipId: payer.membershipId,
      amountCents: payer.amountCents,
      user: serializeMembershipUser(payer.membership),
    })),
    shares: expense.shares.map((share) => ({
      id: share.id,
      membershipId: share.membershipId,
      weight: share.weight,
      amountCents: share.amountCents,
      user: serializeMembershipUser(share.membership),
    })),
  };
};
