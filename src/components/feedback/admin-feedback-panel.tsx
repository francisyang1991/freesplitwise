"use client";

import { useState } from "react";
import type { Feedback, User } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

type FeedbackWithAuthor = Feedback & {
  user: Pick<User, "id" | "name" | "email"> | null;
};

type Props = {
  entries: FeedbackWithAuthor[];
};

export function AdminFeedbackPanel({ entries }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Recent feedback</h2>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-500"
        >
          {isOpen ? "Hide feedback" : "Show feedback"}
        </button>
      </div>
      {isOpen ? (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900">
                    {entry.user?.name ?? entry.user?.email ?? "Unknown member"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {entry.rating ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {entry.rating} / 5
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">No rating</span>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-600">{entry.message}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
