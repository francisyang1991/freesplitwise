"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BalanceEntry,
  SettlementSuggestion,
} from "@/lib/settlement";
import { formatCurrency } from "@/lib/currency";

type Props = {
  groupId: string;
  currency: string;
  balances: BalanceEntry[];
  settlements: SettlementSuggestion[];
  currentMemberId: string | null;
};

const nameFor = (member: BalanceEntry["member"]) => {
  return member.name ?? member.email ?? "Unknown";
};

const settlementLine = (settlement: SettlementSuggestion, currency: string) => {
  const from = nameFor(settlement.fromMember);
  const to = nameFor(settlement.toMember);
  return `${from} → ${to}: ${formatCurrency(settlement.amountCents, currency)}`;
};

export function GroupSettlementsPanel({
  groupId,
  currency,
  balances,
  settlements,
  currentMemberId,
}: Props) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ledgerBalances, setLedgerBalances] = useState<BalanceEntry[]>(balances);
  const [ledgerSettlements, setLedgerSettlements] = useState<SettlementSuggestion[]>(settlements);

  useEffect(() => {
    setLedgerBalances(balances);
    setLedgerSettlements(settlements);
  }, [balances, settlements]);

  const refreshLedger = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/groups/${groupId}/settlements`);
      if (!response.ok) {
        throw new Error("Failed to refresh settlements");
      }
      const payload = await response.json();
      setLedgerBalances(payload.balances ?? []);
      setLedgerSettlements(payload.settlements ?? []);
    } catch (error) {
      console.error("Unable to refresh settlements", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object" &&
        "groupId" in event.detail &&
        event.detail.groupId === groupId
      ) {
        void refreshLedger();
      }
    };

    window.addEventListener("group:expenses-updated", handler);
    return () => {
      window.removeEventListener("group:expenses-updated", handler);
    };
  }, [groupId, refreshLedger]);

  const totalOwed = ledgerBalances
    .filter((balance) => balance.netCents < 0)
    .reduce((sum, balance) => sum + Math.abs(balance.netCents), 0);

  const totalCredited = ledgerBalances
    .filter((balance) => balance.netCents > 0)
    .reduce((sum, balance) => sum + balance.netCents, 0);

  const copyText = useMemo(() => {
    if (ledgerSettlements.length === 0) {
      return "All settled up!";
    }
    return ledgerSettlements
      .map((settlement) => settlementLine(settlement, currency))
      .join("\n");
  }, [currency, ledgerSettlements]);

  const venmoHref = (settlement: SettlementSuggestion) => {
    const amount = (settlement.amountCents / 100).toFixed(2);
    const note = encodeURIComponent(
      `SplitNinja settlement with ${nameFor(settlement.toMember)}`,
    );
    // Use venmo:// deep link to open payment page directly with amount and note
    // Fallback to web URL if app is not installed
    return `venmo://paycharge?txn=pay&amount=${amount}&note=${note}`;
  };

  const handleVenmoClick = (settlement: SettlementSuggestion, event: React.MouseEvent) => {
    event.preventDefault();
    const amount = (settlement.amountCents / 100).toFixed(2);
    const note = encodeURIComponent(
      `SplitNinja settlement with ${nameFor(settlement.toMember)}`,
    );
    
    // Try deep link first
    const deepLink = `venmo://paycharge?txn=pay&amount=${amount}&note=${note}`;
    const webLink = `https://venmo.com/?txn=pay&amount=${amount}&note=${note}`;
    
    // Create a hidden link to test if deep link works
    const testLink = document.createElement('a');
    testLink.href = deepLink;
    testLink.style.display = 'none';
    document.body.appendChild(testLink);
    
    // Set up fallback timer
    const fallbackTimer = setTimeout(() => {
      window.open(webLink, '_blank');
    }, 1000);
    
    // Try deep link
    testLink.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(testLink);
      clearTimeout(fallbackTimer);
    }, 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy settlement summary", error);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Settlements
        </h2>
        <button
          type="button"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-100"
          onClick={handleCopy}
        >
          {copyStatus === "copied"
            ? "Copied!"
            : copyStatus === "error"
            ? "Copy failed"
            : "Copy summary"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void refreshLedger()}
        className="mt-3 inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-100"
        disabled={isRefreshing}
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>

      <div className="mt-4 grid gap-4 text-sm text-zinc-600">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Balances snapshot
          </p>
          <ul className="mt-2 space-y-1">
            {ledgerBalances.map((balance) => (
              <li
                key={balance.membershipId}
                className="flex items-center justify-between"
              >
                <span className="font-medium text-zinc-700">
                  {nameFor(balance.member)}
                </span>
                <span
                  className={
                    balance.netCents > 0
                      ? "text-emerald-600"
                      : balance.netCents < 0
                      ? "text-red-600"
                      : "text-zinc-500"
                  }
                >
                  {balance.netCents === 0
                    ? "Settled"
                    : balance.netCents > 0
                    ? `Ahead ${formatCurrency(balance.netCents, currency)}`
                    : `Owes ${formatCurrency(Math.abs(balance.netCents), currency)}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>Total owed: {formatCurrency(totalOwed, currency)}</span>
            <span>Total credited: {formatCurrency(totalCredited, currency)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Suggested transfers
          </p>
          {ledgerSettlements.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">
              Everyone is squared up.
            </p>
          ) : (
            <ol className="mt-2 space-y-2 text-sm text-zinc-700">
              {ledgerSettlements.map((settlement, index) => {
                const actionLabel =
                  currentMemberId && settlement.toMembershipId === currentMemberId
                    ? "Request"
                    : "Pay";
                return (
                  <li
                    key={`${settlement.fromMembershipId}-${settlement.toMembershipId}-${index}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        {nameFor(settlement.fromMember)} pays {nameFor(settlement.toMember)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(settlement.amountCents, currency)}
                        </span>
                        <button
                          onClick={(e) => handleVenmoClick(settlement, e)}
                          className="rounded-md border border-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 transition hover:bg-emerald-50"
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
