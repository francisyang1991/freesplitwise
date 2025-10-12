import type { Group, Membership, User } from "@prisma/client";

type GroupWithMemberships = Group & {
  inviteCode: string | null;
  memberships: Pick<Membership, "id" | "userId" | "role">[];
};

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  inviteCode: string | null;
  memberCount: number;
  role: "OWNER" | "MEMBER";
  membershipId: string | null;
  netBalanceCents: number | null;
  createdAt: string;
  updatedAt: string;
};

type MembershipWithUser = Membership & {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
};

export type GroupMemberInfo = {
  membershipId: string;
  userId: string;
  role: "OWNER" | "MEMBER";
  name: string | null;
  email: string | null;
  image: string | null;
  joinedAt: string;
};

export const toGroupSummary = (
  group: GroupWithMemberships,
  userId: string,
  netBalanceCents: number | null = null,
): GroupSummary => {
  const membership = group.memberships.find((m) => m.userId === userId);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    inviteCode: group.inviteCode ?? null,
    memberCount: group.memberships.length,
    role: membership?.role ?? "MEMBER",
    membershipId: membership?.id ?? null,
    netBalanceCents,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
};

export const toGroupMemberInfo = (
  membership: MembershipWithUser,
): GroupMemberInfo => {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    role: membership.role,
    name: membership.user?.name ?? null,
    email: membership.user?.email ?? null,
    image: membership.user?.image ?? null,
    joinedAt: membership.joinedAt.toISOString(),
  };
};
