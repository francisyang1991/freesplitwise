import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simplifySettlements, buildSettlementLedger } from "@/lib/settlement";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    // Verify user is member of the group
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Get group with expenses and memberships
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        expenses: {
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
        },
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
        settlements: {
          include: {
            fromMember: {
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
            toMember: {
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

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Calculate settlements
    const settlements = simplifySettlements(group.expenses);
    const ledgerSettlements = buildSettlementLedger(settlements, group.memberships);

    // Merge tracked settlements with calculated ones
    const mergedSettlements = ledgerSettlements.map((settlement) => {
      const trackedSettlement = group.settlements.find(
        (tracked) =>
          tracked.fromMembershipId === settlement.fromMembershipId &&
          tracked.toMembershipId === settlement.toMembershipId
      );
      
      return {
        ...settlement,
        status: trackedSettlement?.status || "PENDING",
      };
    });

    return NextResponse.json({
      settlements: mergedSettlements,
      trackedSettlements: group.settlements,
    });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;
    const { fromMembershipId, toMembershipId, amountCents, status } = await request.json();

    // Verify user is member of the group
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Create or update settlement
    const settlement = await prisma.settlement.upsert({
      where: {
        fromMembershipId_toMembershipId: {
          fromMembershipId,
          toMembershipId,
        },
      },
      update: {
        status,
        requestedAt: status === "REQUESTED" ? new Date() : undefined,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
      create: {
        groupId,
        fromMembershipId,
        toMembershipId,
        amountCents,
        status,
        requestedAt: status === "REQUESTED" ? new Date() : undefined,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
      include: {
        fromMember: {
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
        toMember: {
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

    return NextResponse.json({ settlement });
  } catch (error) {
    console.error("Error creating/updating settlement:", error);
    return NextResponse.json(
      { error: "Failed to create/update settlement" },
      { status: 500 }
    );
  }
}