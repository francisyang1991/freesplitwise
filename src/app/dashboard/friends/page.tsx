import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { FriendsPanel } from "@/components/friends/friends-panel";

export default async function FriendsPage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin");
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Friends</h1>
        <p className="text-sm text-zinc-600">
          Track and manage the people you split expenses with most.
        </p>
      </div>
      <FriendsPanel />
    </section>
  );
}
