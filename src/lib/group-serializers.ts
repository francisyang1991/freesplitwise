import type { Group, Membership, User } from "@prisma/client";

type GroupWithMemberships = Group & {
  memberships: Pick<Membership, "userId" | "role">[];
};

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  memberCount: number;
  role: "OWNER" | "MEMBER";
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
): GroupSummary => {
  const membership = group.memberships.find((m) => m.userId === userId);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    memberCount: group.memberships.length,
    role: membership?.role ?? "MEMBER",
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
