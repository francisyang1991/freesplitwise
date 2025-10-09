"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { GroupSummary } from "@/lib/group-serializers";

type Props = {
  initialGroups: GroupSummary[];
};

type FormState = {
  name: string;
  description: string;
  currency: string;
};

export function GroupsSection({ initialGroups }: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>(initialGroups);
  const [formState, setFormState] = useState<FormState>({
    name: "",
    description: "",
    currency: "USD",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (key: keyof FormState) => (value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormState({
      name: "",
      description: "",
      currency: "USD",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setError("Please provide a group name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          currency: formState.currency,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to create group");
      }

      const created: GroupSummary = await res.json();
      setGroups((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="group-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Group name
            </label>
            <input
              id="group-name"
              name="name"
              type="text"
              autoComplete="off"
              value={formState.name}
              onChange={(event) => onChange("name")(event.target.value)}
              placeholder="Ski Trip 2025"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>
          <div>
            <label
              htmlFor="group-description"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Description (optional)
            </label>
            <textarea
              id="group-description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={(event) => onChange("description")(event.target.value)}
              placeholder="Who’s invited? Any notes to remember?"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label
              htmlFor="group-currency"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Currency
            </label>
            <input
              id="group-currency"
              name="currency"
              type="text"
              maxLength={3}
              value={formState.currency}
              onChange={(event) => onChange("currency")(event.target.value)}
              className="mt-2 w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create group"}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Your groups</h2>
          <p className="text-sm text-zinc-500">{groups.length} total</p>
        </div>
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
            No groups yet. Create one above to get started.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/dashboard/groups/${group.id}`}
                  className="block h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-zinc-900">
                      {group.name}
                    </h3>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      {group.role.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-2 h-[48px] overflow-hidden text-sm text-zinc-600">
                    {group.description ?? "No description yet."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>{group.memberCount} members</span>
                    <span>{group.currency}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
