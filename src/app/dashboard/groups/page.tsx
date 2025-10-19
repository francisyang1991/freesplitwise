export const revalidate = 10;

import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { GroupsSection } from "@/components/groups/groups-section";
import { loadGroupsSnapshot } from "@/lib/dashboard-server";

export default async function GroupsPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  const { groupSummaries } = await loadGroupsSnapshot(session.user.id);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Groups</h1>
        <p className="text-sm text-zinc-600">
          Create new groups or manage the ones you are already part of.
        </p>
      </div>
      <GroupsSection initialGroups={groupSummaries} />
    </section>
  );
}
