export const revalidate = 10;

import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  redirect("/dashboard/groups");
}
