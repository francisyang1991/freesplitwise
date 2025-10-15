"use client";

import { useEffect, useState } from "react";

interface Friend {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  friendshipCreatedAt: string;
}

interface FriendsPanelProps {
  onAddFriend?: (friend: Friend) => void;
  showAddButton?: boolean;
}

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
        setFriends(data);
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
        <div className="flex items-center gap-3 mb-4">
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
        <div className="flex items-center gap-3 mb-4">
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
      <div className="flex items-center gap-3 mb-4">
        <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="text-lg font-semibold text-zinc-900">
          Your Friends ({friends.length})
        </h3>
      </div>

      {friends.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">
          <svg className="h-12 w-12 mx-auto mb-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm">No friends yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            Join groups to automatically make friends with other members
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {friend.image ? (
                  <img
                    src={friend.image}
                    alt={friend.name || friend.email || "Friend"}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center">
                    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {friend.name || friend.email || "Unknown"}
                  </p>
                  {friend.name && friend.email && (
                    <p className="text-xs text-zinc-500">{friend.email}</p>
                  )}
                </div>
              </div>
              {showAddButton && onAddFriend && (
                <button
                  onClick={() => onAddFriend(friend)}
                  className="text-xs px-3 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                >
                  Add to Group
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
