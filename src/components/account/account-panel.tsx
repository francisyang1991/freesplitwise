import { formatCurrency } from "@/lib/currency";

type AccountPanelUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "MEMBER" | "ADMIN";
};

type AccountBalance = {
  currency: string;
  amountCents: number;
};

type AccountPanelProps = {
  user: AccountPanelUser;
  balances?: AccountBalance[];
};

export function AccountPanel({ user, balances = [] }: AccountPanelProps) {
  const displayName = user.name ?? user.email ?? "Your account";
  const sortedBalances = [...balances].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {user.image ? (
          <img
            alt={displayName}
            src={user.image}
            className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 text-sm font-semibold text-zinc-500">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
          {user.email ? (
            <p className="text-xs text-zinc-500">{user.email}</p>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
        <div>
          <dt className="font-medium text-zinc-700">Role</dt>
          <dd className="mt-1 uppercase tracking-wide text-zinc-500">
            {user.role ?? "member"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-700">Status</dt>
          <dd className="mt-1 text-emerald-600">Active</dd>
        </div>
      </dl>
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Balances
        </p>
        {sortedBalances.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">No balances to show yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {sortedBalances.map((balance) => {
              const amountClass =
                balance.amountCents > 0
                  ? "text-emerald-600"
                  : balance.amountCents < 0
                    ? "text-rose-600"
                    : "text-zinc-500";
              return (
                <li
                  key={balance.currency}
                  className="flex items-center justify-between py-2"
                >
                  <span className="font-medium text-zinc-700">
                    {balance.currency}
                  </span>
                  <span className={`font-semibold ${amountClass}`}>
                    {formatCurrency(balance.amountCents, balance.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
