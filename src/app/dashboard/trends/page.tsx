import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrendsDashboard } from "@/components/trends/trends-dashboard";

export default async function TrendsPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  // Get user's groups with expenses
  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: {
          userId: session.user.id,
        },
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
        orderBy: {
          occurredAt: "desc",
        },
      },
    },
  });

  return <TrendsDashboard groups={groups} userId={session.user.id} />;
}
