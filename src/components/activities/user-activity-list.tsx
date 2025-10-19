import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/currency";

export type UserActivityEntry = {
  id: string;
  groupId: string;
  description: string;
  occurredAt: string;
  currency: string;
  totalAmountCents: number;
  groupName: string;
  userPaidCents: number;
  userShareCents: number;
};

export function UserActivityList({ activities }: { activities: UserActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-600">No recent activity yet</p>
        <p className="mt-2 text-xs text-zinc-400">
          Add expenses with your friends and they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const occurredAt = new Date(activity.occurredAt);
        const userNet = activity.userPaidCents - activity.userShareCents;
        const netLabel =
          userNet > 0
            ? `You are ahead ${formatCurrency(userNet, activity.currency)}`
            : userNet < 0
              ? `You owe ${formatCurrency(Math.abs(userNet), activity.currency)}`
              : "Settled up";
        const netClass =
          userNet > 0
            ? "text-emerald-600"
            : userNet < 0
              ? "text-rose-600"
              : "text-zinc-500";

        const youPaid = activity.userPaidCents > 0
          ? `You paid ${formatCurrency(activity.userPaidCents, activity.currency)}`
          : null;
        const youOwe = activity.userShareCents > 0
          ? `Your share ${formatCurrency(activity.userShareCents, activity.currency)}`
          : null;

        return (
          <Link
            key={activity.id}
            href={`/dashboard/groups/${activity.groupId}?expenseId=${activity.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <article>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {activity.description || "Expense"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activity.groupName} ·{" "}
                    {formatDistanceToNow(occurredAt, { addSuffix: true })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-700">
                  {formatCurrency(activity.totalAmountCents, activity.currency)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                {youPaid ? <span>{youPaid}</span> : null}
                {youOwe ? <span>{youOwe}</span> : null}
              </div>
              <p className={`mt-3 text-xs font-semibold uppercase tracking-wide ${netClass}`}>
                {netLabel}
              </p>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
