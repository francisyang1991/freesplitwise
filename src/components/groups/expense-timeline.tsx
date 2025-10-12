"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";
import type { ExpenseSummary } from "@/lib/expense-serializers";

interface ExpenseHistoryEntry {
  id: string;
  action: string;
  changes: any;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface ExpenseTimelineProps {
  expense: ExpenseSummary;
  groupId: string;
}

export function ExpenseTimeline({ expense, groupId }: ExpenseTimelineProps) {
  const [history, setHistory] = useState<ExpenseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/expenses/${expense.id}/history`);
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [expense.id, groupId]);

  const formatAction = (action: string, changes: any) => {
    switch (action) {
      case "created":
        return "Created this expense";
      case "updated":
        if (changes?.description) {
          return `Updated description to "${changes.description}"`;
        }
        if (changes?.totalAmountCents) {
          return `Updated amount to ${formatCurrency(changes.totalAmountCents, expense.currency)}`;
        }
        return "Updated this expense";
      case "deleted":
        return "Deleted this expense";
      default:
        return `Performed ${action} on this expense`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserDisplayName = (user: ExpenseHistoryEntry["user"]) => {
    if (user.name) return user.name;
    if (user.email) return user.email.split("@")[0];
    return "Unknown User";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Activity Timeline
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Activity Timeline
        </h3>
        <div className="text-center py-8">
          <p className="text-sm text-red-600">Failed to load timeline: {error}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Activity Timeline
        </h3>
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500">No activity recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
        Activity Timeline
      </h3>
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div key={entry.id} className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                {entry.user.image ? (
                  <img
                    src={entry.user.image}
                    alt={getUserDisplayName(entry.user)}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <span className="text-xs font-semibold text-emerald-600">
                    {getUserDisplayName(entry.user).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">
                  {getUserDisplayName(entry.user)}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatTime(entry.createdAt)}
                </span>
              </div>
              <p className="text-sm text-zinc-600 mt-1">
                {formatAction(entry.action, entry.changes)}
              </p>
            </div>
            {index < history.length - 1 && (
              <div className="absolute left-4 top-12 h-4 w-px bg-zinc-200"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
