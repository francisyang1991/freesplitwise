"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GroupMemberInfo } from "@/lib/group-serializers";

type GroupMembersPanelProps = {
  groupId: string;
  members: GroupMemberInfo[];
  isAdmin: boolean;
  showForm?: boolean;
};

export function GroupMembersPanel({
  groupId,
  members,
  isAdmin,
  showForm = true,
}: GroupMembersPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    setStatus("submitting");
    setErrorMessage(null);

    const payload = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    };

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to add member");
      }

      setStatus("success");
      setName("");
      setEmail("");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Members
        </h2>
        {isAdmin ? (
          <span className="text-xs uppercase text-emerald-600">Admin mode</span>
        ) : null}
      </div>

      <ul className="mt-4 space-y-3 text-sm text-zinc-700">
        {members.map((membership) => (
          <li key={membership.membershipId} className="flex items-center gap-3">
            {membership.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={membership.image}
                alt={membership.name ?? membership.email ?? ""}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                {membership.name?.[0]?.toUpperCase() ??
                  membership.email?.[0]?.toUpperCase() ??
                  "?"}
              </span>
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                {membership.name ?? membership.email ?? "Member"}
              </span>
              <span className="text-xs uppercase text-zinc-500">
                {membership.role.toLowerCase()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {isAdmin && showForm ? (
        <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="member-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Display name
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              placeholder="Daisy Debug"
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label
              htmlFor="member-email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Email (optional)
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              placeholder="debug+1@example.com"
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Leave blank to auto-generate a placeholder email for testing.
            </p>
          </div>
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
          {status === "success" ? (
            <p className="text-sm text-emerald-600">Member added.</p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Adding..." : "Add member"}
            </button>
            <button
              type="button"
              onClick={() => {
                setName("");
                setEmail("");
                setStatus("idle");
                setErrorMessage(null);
              }}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white"
            >
              Reset
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={async () => {
                setSeedStatus("running");
                setSeedMessage(null);
                try {
                  const res = await fetch(`/api/groups/${groupId}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ generateDummy: true, count: 5 }),
                  });
                  if (!res.ok) {
                    const payload = await res.json().catch(() => null);
                    throw new Error(payload?.error ?? "Unable to add dummy members");
                  }
                  const payload = await res.json();
                  setSeedStatus("success");
                  setSeedMessage(`Added ${payload?.added ?? 5} test members.`);
                  router.refresh();
                } catch (error) {
                  setSeedStatus("error");
                  setSeedMessage(
                    error instanceof Error ? error.message : "Failed to add dummy members.",
                  );
                }
              }}
              className="inline-flex items-center justify-center rounded-md border border-dashed border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={seedStatus === "running"}
            >
              {seedStatus === "running" ? "Seeding..." : "Add 5 dummy members"}
            </button>
            {seedMessage ? (
              <p
                className={`text-sm ${
                  seedStatus === "error" ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {seedMessage}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
