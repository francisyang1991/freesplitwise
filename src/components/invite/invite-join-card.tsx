"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  groupId: string;
  groupName: string;
  memberCount: number;
  ownerName: string;
};

type JoinStatus = "idle" | "joining" | "error";

export function InviteJoinCard({ groupId, groupName, memberCount, ownerName }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<JoinStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    startTransition(async () => {
      setStatus("joining");
      setError(null);
      try {
        const response = await fetch(`/api/invite/${groupId}`, {
          method: "POST",
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to join this group.");
        }
        setStatus("idle");
        router.push(`/dashboard/groups/${groupId}`);
        router.refresh();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unexpected error.");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm text-zinc-600">
          You&apos;re about to join <span className="font-semibold text-zinc-900">{groupName}</span>.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Hosted by {ownerName}. {memberCount} member{memberCount === 1 ? "" : "s"} already inside.
        </p>
      </div>
      <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-700">
        <p>
          Joining grants you access to the group ledger, expenses, and settlements. You can leave any
          time from the group settings menu.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleJoin}
          disabled={status === "joining" || isPending}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "joining" || isPending ? "Joining..." : "Join group"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
