"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SettlementSuggestion } from "@/lib/settlement";
import type { GroupMemberInfo } from "@/lib/group-serializers";
import { formatCurrency } from "@/lib/currency";

type SettleUpDialogProps = {
  groupId: string;
  currency: string;
  settlements: SettlementSuggestion[];
  members: GroupMemberInfo[];
  currentMemberId: string | null;
};

const nameForMember = (member: GroupMemberInfo | null | undefined) =>
  member?.name ?? member?.email ?? "Member";

export function SettleUpDialog({
  groupId,
  currency,
  settlements,
  members,
  currentMemberId,
}: SettleUpDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const relevantSettlements = useMemo(() => {
    if (!currentMemberId) {
      return [];
    }

    return settlements
      .filter(
        (settlement) =>
          settlement.fromMembershipId === currentMemberId ||
          settlement.toMembershipId === currentMemberId,
      )
      .map((settlement) => {
        const isCurrentUserCreditor = settlement.toMembershipId === currentMemberId;
        const counterparty = isCurrentUserCreditor
          ? members.find((member) => member.membershipId === settlement.fromMembershipId) ?? null
          : members.find((member) => member.membershipId === settlement.toMembershipId) ?? null;

        const counterpartyName = nameForMember(counterparty);
        const amount = formatCurrency(settlement.amountCents, currency);
        const id = `${settlement.fromMembershipId}-${settlement.toMembershipId}`;

        return {
          id,
          settlement,
          isCurrentUserCreditor,
          counterparty,
          counterpartyName,
          amount,
          subtitle: isCurrentUserCreditor
            ? `${counterpartyName} owes you ${amount}`
            : `You owe ${counterpartyName} ${amount}`,
        };
      });
  }, [currentMemberId, currency, members, settlements]);

  useEffect(() => {
    if (relevantSettlements.length === 0) {
      setSelectedSettlementId(null);
    } else if (
      !selectedSettlementId ||
      !relevantSettlements.some((option) => option.id === selectedSettlementId)
    ) {
      setSelectedSettlementId(relevantSettlements[0]?.id ?? null);
    }
  }, [relevantSettlements, selectedSettlementId]);

  const selectedOption = relevantSettlements.find(
    (option) => option.id === selectedSettlementId,
  );

  const handleStatusUpdate = (status: "REQUESTED" | "PAID") => {
    if (!selectedOption) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/settlements`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromMembershipId: selectedOption.settlement.fromMembershipId,
            toMembershipId: selectedOption.settlement.toMembershipId,
            amountCents: selectedOption.settlement.amountCents,
            status,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to update settlement right now. Please try again.");
        }

        setIsOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    });
  };

  const handlePay = () => {
    if (!selectedOption || selectedOption.isCurrentUserCreditor) {
      return;
    }

    const { settlement, counterpartyName } = selectedOption;
    const amount = (settlement.amountCents / 100).toFixed(2);
    const note = encodeURIComponent(`SplitNinja settlement with ${counterpartyName}`);

    const deepLinkFormats = [
      `venmo://venmo.com/paycharge?txn=pay&amount=${amount}&note=${note}`,
      `venmo://paycharge?txn=pay&amount=${amount}&note=${note}`,
      `venmo://venmo.com/pay?txn=pay&amount=${amount}&note=${note}`,
    ];

    const webLink = `https://venmo.com/?txn=pay&amount=${amount}&note=${note}`;
    let deepLinkSucceeded = false;

    deepLinkFormats.forEach((deepLink, index) => {
      const link = document.createElement("a");
      link.href = deepLink;
      link.style.display = "none";
      document.body.appendChild(link);

      const fallbackTimer = setTimeout(() => {
        if (!deepLinkSucceeded && index === deepLinkFormats.length - 1) {
          window.open(webLink, "_blank");
        }
        document.body.removeChild(link);
      }, 500);

      link.click();

      setTimeout(() => {
        deepLinkSucceeded = true;
        clearTimeout(fallbackTimer);
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 100);
    });
  };

  const hasActionableSettlements = relevantSettlements.length > 0;
  const canRequest = selectedOption?.isCurrentUserCreditor ?? false;
  const canPay = selectedOption ? !selectedOption.isCurrentUserCreditor : false;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!hasActionableSettlements}
        className="rounded-md border border-emerald-400 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
      >
        Settle up
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Settle up</h2>
                <p className="text-xs text-zinc-500">
                  Choose who you want to settle with and how you want to handle it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-zinc-200 p-1 text-zinc-500 transition hover:bg-zinc-50"
                aria-label="Close settle up dialog"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {relevantSettlements.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                Everyone is settled up. Add or adjust expenses to create new balances.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {relevantSettlements.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSettlementId(option.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        selectedSettlementId === option.id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-zinc-900">
                        {option.counterpartyName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{option.subtitle}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={!canPay || isPending}
                    className="rounded-md border border-emerald-400 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
                  >
                    Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("REQUESTED")}
                    disabled={!canRequest || isPending}
                    className="rounded-md border border-amber-400 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("PAID")}
                    disabled={isPending}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
                  >
                    Record cash payment
                  </button>
                </div>

                {error ? (
                  <p className="mt-3 text-xs text-rose-600">{error}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
