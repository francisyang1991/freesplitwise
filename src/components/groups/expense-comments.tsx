"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";

type ExpenseComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  isOfficial: boolean;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type ExpenseCommentsProps = {
  groupId: string;
  expenseId: string;
  refreshKey?: number;
};

export function ExpenseComments({ groupId, expenseId, refreshKey = 0 }: ExpenseCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(
          `/api/groups/${groupId}/expenses/${expenseId}/comments`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }
        const data = await response.json();
        setComments(data.comments ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch comments");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [expenseId, groupId, refreshKey]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/expenses/${expenseId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: trimmed }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to post comment");
      }

      const data = await response.json();
      setComments((prev) => [...prev, data.comment]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments],
  );

  const renderAvatar = (comment: ExpenseComment) => {
    if (comment.isOfficial) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold uppercase text-emerald-700">
          SN
        </div>
      );
    }

    if (comment.author?.image) {
      return (
        <img
          src={comment.author.image}
          alt={comment.author.name ?? comment.author.email ?? "Member"}
          className="h-8 w-8 rounded-full object-cover"
        />
      );
    }

    const fallback = comment.author?.name ?? comment.author?.email ?? "Member";
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold uppercase text-zinc-600">
        {fallback.charAt(0).toUpperCase()}
      </div>
    );
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const currentUserCanComment = Boolean(session?.user?.id);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Comments
        </h3>
        <span className="text-xs text-zinc-400">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
        </div>
      ) : error ? (
        <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : sortedComments.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
          No comments yet. Start the conversation below.
        </p>
      ) : (
        <ul className="mb-5 space-y-4">
          {sortedComments.map((comment) => (
            <li
              key={comment.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${
                comment.isOfficial
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-zinc-100 bg-white"
              }`}
            >
              {renderAvatar(comment)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {comment.isOfficial
                      ? comment.authorName ?? "SplitNinja"
                      : comment.author?.name ??
                        comment.author?.email ??
                        "Member"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 whitespace-pre-line">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {currentUserCanComment ? (
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Leave a comment for your group..."
            className="w-full min-h-[88px] resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {input.trim().length}/1000 characters
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !input.trim()}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-xs text-zinc-500">
          Sign in to leave a comment on this expense.
        </p>
      )}
    </div>
  );
}
