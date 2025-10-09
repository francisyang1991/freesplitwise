"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { GroupMemberInfo } from "@/lib/group-serializers";
import type { ExpenseSummary } from "@/lib/expense-serializers";
import { formatCurrency, parseCurrencyToCents } from "@/lib/currency";

type Props = {
  groupId: string;
  currency: string;
  members: GroupMemberInfo[];
  initialExpenses: ExpenseSummary[];
};

type MemberRow = {
  membershipId: string;
  paid: string;
  weight: string;
  included: boolean;
  autoPaid: boolean;
};

const distributeAutoPaid = (
  rows: MemberRow[],
  totalAmountCents: number,
): MemberRow[] => {
  let next: MemberRow[] | null = null;

  const setPaid = (index: number, value: string) => {
    if (next) {
      next[index].paid = value;
      return;
    }
    if (rows[index].paid === value) {
      return;
    }
    next = rows.map((row) => ({ ...row }));
    next[index].paid = value;
  };

  const manualPaidCents = rows.reduce((sum, row) => {
    if (!row.included || row.autoPaid) {
      return sum;
    }
    const cents = parseCurrencyToCents(row.paid);
    if (!cents || cents <= 0) {
      return sum;
    }
    return sum + cents;
  }, 0);

  const amountToDistribute = totalAmountCents - manualPaidCents;
  const autoEntries = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.included && row.autoPaid);

  rows.forEach((row, idx) => {
    if (!row.included || amountToDistribute <= 0) {
      if (row.autoPaid && row.paid !== "") {
        setPaid(idx, "");
      }
    }
  });

  if (amountToDistribute <= 0 || autoEntries.length === 0) {
    return next ?? rows;
  }

  const distributable = Math.max(0, amountToDistribute);
  const base = Math.floor(distributable / autoEntries.length);
  let remainder = distributable - base * autoEntries.length;

  autoEntries.forEach(({ idx }) => {
    let amount = base;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    const formatted = amount > 0 ? (amount / 100).toFixed(2) : "";
    setPaid(idx, formatted);
  });

  return next ?? rows;
};

const todayInputValue = () => new Date().toISOString().split("T")[0] ?? "";

const displayName = (
  member: GroupMemberInfo | null,
  fallback?: string | null,
) => {
  if (member?.name) return member.name;
  if (member?.email) return member.email;
  if (fallback) return fallback;
  return "Unknown";
};

const displayNameFromUser = (
  user:
    | {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
      }
    | null,
) => {
  if (user?.name) return user.name;
  if (user?.email) return user.email;
  return "Unknown";
};

export function GroupExpensesSection({
  groupId,
  currency,
  members,
  initialExpenses,
}: Props) {
  const initialRows = useMemo<MemberRow[]>(
    () =>
      members.map((member) => ({
        membershipId: member.membershipId,
        paid: "",
        weight: "1",
        included: true,
        autoPaid: true,
      })),
    [members],
  );

  const [rows, setRows] = useState<MemberRow[]>(() => initialRows);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => todayInputValue());
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const totalAmountCents = parseCurrencyToCents(totalAmount) ?? 0;
  useEffect(() => {
    setRows((prevRows) => {
      const prevMap = new Map(
        prevRows.map((row) => [row.membershipId, row]),
      );
      let needsSync = false;
      const nextRows = members.map((member) => {
        const existing = prevMap.get(member.membershipId);
        if (existing) {
          return existing;
        }
        needsSync = true;
        return {
          membershipId: member.membershipId,
          paid: "",
          weight: "1",
          included: true,
          autoPaid: true,
        };
      });

      if (prevRows.length !== nextRows.length) {
        needsSync = true;
      }

      const baseRows = needsSync ? nextRows : prevRows;
      return distributeAutoPaid(baseRows, totalAmountCents);
    });
  }, [members, totalAmountCents]);
  const totalPaidCents = rows.reduce((sum, row) => {
    const cents = parseCurrencyToCents(row.paid);
    return cents && cents > 0 ? sum + cents : sum;
  }, 0);

  const includedRows = rows.filter((row) => row.included);
  const totalWeight = includedRows.reduce((sum, row) => {
    const weight = Number(row.weight);
    return Number.isFinite(weight) && weight > 0 ? sum + weight : sum;
  }, 0);

  const sharePreviewMap = useMemo(() => {
    const map = new Map<string, number>();
    if (totalWeight <= 0 || totalAmountCents <= 0) {
      return map;
    }

    let distributed = 0;
    includedRows.forEach((row, index) => {
      const weight = Number(row.weight);
      if (!Number.isFinite(weight) || weight <= 0) {
        return;
      }
      let amount = Math.round((weight / totalWeight) * totalAmountCents);
      if (index === includedRows.length - 1) {
        amount = totalAmountCents - distributed;
      }
      distributed += amount;
      map.set(row.membershipId, amount);
    });
    return map;
  }, [includedRows, totalAmountCents, totalWeight]);

  const handleRowChange = (
    membershipId: string,
    key: "paid" | "weight" | "included",
    value: string | boolean,
  ) => {
    setRows((prevRows) => {
      const nextRows = prevRows.map((row) => {
        if (row.membershipId !== membershipId) {
          return row;
        }

        if (key === "paid") {
          const stringValue = String(value);
          const shouldAuto = stringValue.trim() === "";
          return {
            ...row,
            paid: stringValue,
            autoPaid: shouldAuto,
          };
        }

        if (key === "included") {
          const included = Boolean(value);
          return {
            ...row,
            included,
            autoPaid: true,
            paid: included ? row.paid : "",
          };
        }

        if (key === "weight") {
          return {
            ...row,
            weight: String(value),
          };
        }

        return row;
      });

      return distributeAutoPaid(nextRows, totalAmountCents);
    });
  };

  const resetForm = (options?: { clearMessages?: boolean }) => {
    const { clearMessages = true } = options ?? {};
    setDescription("");
    setTotalAmount("");
    setOccurredAt(todayInputValue());
    setRows(
      members.map((member) => ({
        membershipId: member.membershipId,
        paid: "",
        weight: "1",
        included: true,
        autoPaid: true,
      })),
    );
    setEditingExpenseId(null);
    if (clearMessages) {
      setSuccess(null);
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (totalAmountCents <= 0) {
        throw new Error("Enter a total greater than zero.");
      }
      if (!description.trim()) {
        throw new Error("Add a short description for the expense.");
      }
      if (includedRows.length === 0) {
        throw new Error("Include at least one participant in the split.");
      }
      if (totalWeight <= 0) {
        throw new Error("Participant weights must total more than zero.");
      }
      if (totalPaidCents !== totalAmountCents) {
        throw new Error("Paid amounts must add up to the total.");
      }

      const payload = {
        description,
        totalAmount,
        currency,
        occurredAt,
        payers: rows
          .map((row) => ({
            membershipId: row.membershipId,
            amount: row.paid,
          }))
          .filter((payer) => {
            const cents = parseCurrencyToCents(payer.amount);
            return cents !== null && cents > 0;
          }),
        shares: includedRows
          .map((row) => ({
            membershipId: row.membershipId,
            weight: Number(row.weight),
          }))
          .filter(
            (share) => Number.isFinite(share.weight) && share.weight > 0,
          ),
      };

      const endpoint = editingExpenseId
        ? `/api/groups/${groupId}/expenses/${editingExpenseId}`
        : `/api/groups/${groupId}/expenses`;
      const method = editingExpenseId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to save expense");
      }

      const saved: ExpenseSummary = await response.json();
      setExpenses((prev) => {
        if (!editingExpenseId) {
          return [saved, ...prev];
        }
        return prev.map((expense) =>
          expense.id === editingExpenseId ? saved : expense,
        );
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("group:expenses-updated", {
            detail: { groupId },
          }),
        );
      }
      setSuccess(
        editingExpenseId ? "Expense updated successfully." : "Expense added successfully.",
      );
      resetForm({ clearMessages: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const memberLookup = useMemo(() => {
    return new Map(members.map((member) => [member.membershipId, member]));
  }, [members]);

  const recentMembers = useMemo(() => {
    const membershipMap = new Map(members.map((member) => [member.membershipId, member]));
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const seen = new Set<string>();
    const result: GroupMemberInfo[] = [];

    for (const expense of sortedExpenses) {
      const ids = new Set<string>();
      expense.shares.forEach((share) => ids.add(share.membershipId));
      expense.payers.forEach((payer) => ids.add(payer.membershipId));

      ids.forEach((membershipId) => {
        if (seen.has(membershipId)) return;
        const member = membershipMap.get(membershipId);
        if (member) {
          seen.add(membershipId);
          result.push(member);
        }
      });

      if (result.length >= 6) break;
    }

    return result;
  }, [expenses, members]);

  const startEditing = (expense: ExpenseSummary) => {
    setEditingExpenseId(expense.id);
    setDescription(expense.description);
    setTotalAmount((expense.totalAmountCents / 100).toFixed(2));
    setOccurredAt(() => expense.occurredAt.split("T")[0] ?? todayInputValue());

    const payerMap = new Map(
      expense.payers.map((payer) => [payer.membershipId, payer.amountCents]),
    );
    const shareMap = new Map(
      expense.shares.map((share) => [share.membershipId, share.weight]),
    );

    setRows(
      members.map((member) => {
        const payerAmount = payerMap.get(member.membershipId) ?? null;
        const shareWeight = shareMap.get(member.membershipId) ?? null;
        return {
          membershipId: member.membershipId,
          paid: payerAmount ? (payerAmount / 100).toFixed(2) : "",
          weight: shareWeight ? String(shareWeight) : "1",
          included: shareWeight !== null,
          autoPaid: payerAmount === null,
        };
      }),
    );
    setSuccess(null);
    setError(null);
  };

  const quickIncludeMember = (membershipId: string) => {
    setRows((prevRows) => {
      const next = prevRows.map((row) => {
        if (row.membershipId !== membershipId) {
          return row;
        }
        const weight = row.weight.trim() ? row.weight : "1";
        return {
          ...row,
          included: true,
          weight,
        };
      });

      return distributeAutoPaid(next, totalAmountCents);
    });
  };

  const [isFormOpen, setIsFormOpen] = useState(false);

  const openForm = (expense?: ExpenseSummary) => {
    if (expense) {
      startEditing(expense);
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleReset = () => {
    resetForm();
    setIsFormOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-zinc-900">Expenses</h2>
          <span className="text-xs text-zinc-500">
            {expenses.length} item{expenses.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => openForm()}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          <span className="text-lg leading-none">＋</span>
          Add expense
        </button>
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No expenses yet. Click &ldquo;Add expense&rdquo; to log the first one.
          </p>
        ) : (
          <ul className="space-y-4">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {expense.description}
                    </h3>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {new Date(expense.occurredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-emerald-700">
                      {formatCurrency(expense.totalAmountCents, expense.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openForm(expense)}
                      className="text-xs font-semibold uppercase tracking-wider text-emerald-600 underline underline-offset-4"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-zinc-600 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-zinc-700">Paid by</p>
                    <ul className="mt-1 space-y-1">
                      {expense.payers.map((payer) => (
                        <li key={payer.id} className="flex justify-between">
                          <span>{displayNameFromUser(payer.user)}</span>
                          <span>
                            {formatCurrency(payer.amountCents, expense.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-700">Split</p>
                    <ul className="mt-1 space-y-1">
                      {expense.shares.map((share) => (
                        <li key={share.id} className="flex justify-between">
                          <span>
                            {displayNameFromUser(share.user)} · weight {share.weight}
                          </span>
                          <span>
                            {formatCurrency(share.amountCents, expense.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="h-full w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingExpenseId ? "Edit expense" : "Add a new expense"}
              </h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-semibold text-emerald-600 underline underline-offset-4"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Track who paid and how the cost should be split using per-person
              weights.
            </p>
            {recentMembers.length > 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-sm">
                <p className="mb-2 font-medium text-emerald-700">
                  Quick add members from recent activity
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentMembers.map((member) => {
                    const linkedRow = rows.find((row) => row.membershipId === member.membershipId);
                    const active = linkedRow?.included ?? false;
                    return (
                      <button
                        key={member.membershipId}
                        type="button"
                        onClick={() => quickIncludeMember(member.membershipId)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "bg-emerald-600 text-white"
                            : "border border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {displayName(member)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <form className="mt-5 grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="expense-description"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Description
              </label>
              <input
                id="expense-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Dinner at La Piazza"
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                required
              />
            </div>
            <div>
              <label
                htmlFor="expense-date"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={occurredAt}
                max={todayInputValue()}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="expense-total"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Total amount ({currency})
              </label>
              <input
                id="expense-total"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                placeholder="123.45"
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                required
              />
              <p className="mt-1 text-xs text-zinc-500">
                Paid total: {formatCurrency(totalPaidCents, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              <p>
                Splitting {formatCurrency(totalAmountCents, currency)} across
                {" "}
                {includedRows.length} participant
                {includedRows.length === 1 ? "" : "s"} with weight total of
                {" "}
                {totalWeight || 0}.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Include</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Paid ({currency})</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Share preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {rows.map((row) => {
                  const member = memberLookup.get(row.membershipId) ?? null;
                  const shareAmount = sharePreviewMap.get(row.membershipId) ?? 0;
                  return (
                    <tr key={row.membershipId}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={(event) =>
                            handleRowChange(
                              row.membershipId,
                              "included",
                              event.target.checked,
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900">
                            {displayName(member)}
                          </span>
                          <span className="text-xs uppercase text-zinc-500">
                            {member?.role.toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.paid}
                          inputMode="decimal"
                          onChange={(event) =>
                            handleRowChange(
                              row.membershipId,
                              "paid",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.weight}
                          onChange={(event) =>
                            handleRowChange(
                              row.membershipId,
                              "weight",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {row.included && totalAmountCents > 0 && totalWeight > 0
                          ? formatCurrency(shareAmount, currency)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-600">{success}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : editingExpenseId
                ? "Update expense"
                : "Save expense"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => resetForm()}
              disabled={isSubmitting}
            >
              Reset
            </button>
          </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
