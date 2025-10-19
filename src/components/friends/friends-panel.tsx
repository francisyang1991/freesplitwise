"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";

type FriendBalance = {
  currency: string;
  amountCents: number;
};

interface Friend {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  friendshipCreatedAt: string;
  balances: FriendBalance[];
}

interface FriendsPanelProps {
  onAddFriend?: (friend: Friend) => void;
  showAddButton?: boolean;
}

const sortFriends = (list: Friend[]) =>
  [...list].sort((a, b) => {
    const aHasBalance = (a.balances ?? []).some((balance) => balance.amountCents !== 0);
    const bHasBalance = (b.balances ?? []).some((balance) => balance.amountCents !== 0);

    if (aHasBalance !== bHasBalance) {
      return aHasBalance ? -1 : 1;
    }

    const nameA = (a.name ?? a.email ?? a.id).toLowerCase();
    const nameB = (b.name ?? b.email ?? b.id).toLowerCase();

    return nameA.localeCompare(nameB);
  });

export function FriendsPanel({ onAddFriend, showAddButton = false }: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/friends");
        if (!response.ok) {
          throw new Error("Failed to fetch friends");
        }
        const data: Friend[] = await response.json();
        setFriends(sortFriends(data));
      } catch (err) {
        console.error("Error fetching friends:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-900">Your Friends</h3>
        </div>
        <div className="text-center text-zinc-500">Loading friends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-900">Your Friends</h3>
        </div>
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="text-lg font-semibold text-zinc-900">
          Your Friends ({friends.length})
        </h3>
      </div>

      {friends.length === 0 ? (
        <div className="py-8 text-center text-zinc-500">
          <svg className="mx-auto mb-3 h-12 w-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm">No friends yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Join groups to automatically make friends with other members
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => {
            const displayName = friend.name || friend.email || "Unknown";
            const sortedBalances = [...(friend.balances ?? [])].sort((a, b) =>
              a.currency.localeCompare(b.currency),
            );
            const nonZeroBalances = sortedBalances.filter(
              (balance) => balance.amountCents !== 0,
            );

            return (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3">
                  {friend.image ? (
                    <img
                      src={friend.image}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
                      <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{displayName}</p>
                    {friend.name && friend.email ? (
                      <p className="text-xs text-zinc-500">{friend.email}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {nonZeroBalances.length === 0 ? (
                      <span className="rounded-md bg-zinc-100 px-2 py-1 font-medium text-zinc-500">
                        Settled up
                      </span>
                    ) : (
                      nonZeroBalances.map((balance) => {
                        const amount = formatCurrency(
                          Math.abs(balance.amountCents),
                          balance.currency,
                        );
                        const isCredit = balance.amountCents > 0;
                        return (
                          <span
                            key={`${friend.id}-${balance.currency}`}
                            className={`rounded-md px-2 py-1 font-semibold ${
                              isCredit
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isCredit ? `They owe you ${amount}` : `You owe ${amount}`}
                          </span>
                        );
                      })
                    )}
                  </div>
                  {showAddButton && onAddFriend ? (
                    <button
                      onClick={() => onAddFriend(friend)}
                      className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                    >
                      Add to Group
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
