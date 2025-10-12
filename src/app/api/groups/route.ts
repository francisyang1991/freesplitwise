import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toGroupSummary } from "@/lib/group-serializers";
import { generateUniqueInviteCode } from "@/lib/invite-code";
import { getMembershipNetBalances } from "@/lib/balances";

const sanitizeCurrency = (currency?: string | null) => {
  if (!currency) return "USD";
  const trimmed = currency.trim().toUpperCase();
  return trimmed.length === 3 ? trimmed : "USD";
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const membershipRecords = groups.flatMap((group) =>
    group.memberships.filter((membership) => membership.userId === session.user.id),
  );

  const netMap = await getMembershipNetBalances(
    membershipRecords.map((membership) => membership.id),
  );

  const payload = groups.map((group) => {
    const membership = group.memberships.find(
      (entry) => entry.userId === session.user.id,
    );
    const net = membership ? netMap.get(membership.id) ?? 0 : 0;
    return toGroupSummary(group, session.user.id, net);
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=30",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : null;
  const currency = sanitizeCurrency(body?.currency);

  if (!name) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 },
    );
  }

  const inviteCode = await generateUniqueInviteCode(prisma);

  const group = await prisma.group.create({
    data: {
      name,
      description,
      currency,
      ownerId: session.user.id,
      inviteCode,
      memberships: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
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
  });

  revalidatePath("/dashboard");
  return NextResponse.json(toGroupSummary(group, session.user.id, 0), {
    status: 201,
  });
}
