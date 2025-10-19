"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { GroupMemberInfo } from "@/lib/group-serializers";
import type { ExpenseSummary } from "@/lib/expense-serializers";
import { formatCurrency, parseCurrencyToCents } from "@/lib/currency";
import { shareManager } from "@/lib/share";
import { ExpenseComments } from "./expense-comments";

type Props = {
  groupId: string;
  currency: string;
  members: GroupMemberInfo[];
  initialExpenses: ExpenseSummary[];
  currentMember: GroupMemberInfo | null;
  initialSelectedExpenseId?: string | null;
};

type MemberRow = {
  membershipId: string;
  paid: string;
  weight: string;
  included: boolean;
  autoPaid: boolean;
};

type SplitMode = "equal" | "weighted";

type BalanceLabel = {
  label: string;
  type: "credit" | "debit";
};

type DetailSection =
  | {
      title: string;
      rows: {
        name: string;
        hint?: string;
        amount: number;
        highlight?: boolean;
      }[];
    }
  | null;

export function GroupExpensesSection({
  groupId,
  currency,
  members,
  initialExpenses,
  currentMember,
  initialSelectedExpenseId = null,
}: Props) {
  const initialRows = useMemo(
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

  const [rows, setRows] = useState<MemberRow[]>(initialRows);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => todayInputValue());
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseSummary | null>(null);
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<ExpenseSummary | null>(null);
  const [isExpensesRefreshing, setIsExpensesRefreshing] = useState(false);
  const initialSelectionRef = useRef<string | null>(initialSelectedExpenseId);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

  useEffect(() => {
    if (initialSelectedExpenseId) {
      initialSelectionRef.current = initialSelectedExpenseId;
    }
  }, [initialSelectedExpenseId]);

  const sessionMemberId = currentMember?.membershipId ?? null;
  const defaultPayerAppliedRef = useRef(false);
  const payerBackupRef = useRef<MemberRow[] | null>(null);

  const totalAmountCents = parseCurrencyToCents(totalAmount) ?? 0;

  const updateRowsWithDistribution = useCallback(
    (updater: (rows: MemberRow[]) => MemberRow[], forceAutoDistribution = false) => {
      setRows((prevRows) => {
        const updatedRows = updater(prevRows);
        // Only apply auto-distribution if explicitly requested or if all rows have autoPaid: true
        const shouldAutoDistribute = forceAutoDistribution || updatedRows.every(row => row.autoPaid);
        return shouldAutoDistribute ? distributeAutoPaid(updatedRows, totalAmountCents) : updatedRows;
      });
    },
    [totalAmountCents],
  );

  useEffect(() => {
    updateRowsWithDistribution((prevRows) => {
      const prevMap = new Map(prevRows.map((row) => [row.membershipId, row]));
      return members.map((member) => {
        const existing = prevMap.get(member.membershipId);
        if (existing) return existing;
        return {
          membershipId: member.membershipId,
          paid: "",
          weight: "1",
          included: true,
          autoPaid: true,
        };
      });
    }, false); // Don't force auto-distribution when members change
  }, [members, updateRowsWithDistribution]);

  useEffect(() => {
    if (editingExpenseId) {
      defaultPayerAppliedRef.current = true;
      return;
    }
    if (totalAmountCents === 0) {
      defaultPayerAppliedRef.current = false;
      return;
    }
    if (!sessionMemberId || defaultPayerAppliedRef.current) return;
    setRows((prev) =>
      prev.map((row) => {
        if (row.membershipId === sessionMemberId) {
          return {
            ...row,
            paid: (totalAmountCents / 100).toFixed(2),
            autoPaid: false,
          };
        }
        return {
          ...row,
          paid: "",
          autoPaid: true,
        };
      }),
    );
    defaultPayerAppliedRef.current = true;
  }, [totalAmountCents, editingExpenseId, sessionMemberId]);

  useEffect(() => {
    setRows((prevRows) => {
      const manualRows = prevRows.filter((row) => !row.autoPaid && row.included);
      if (manualRows.length !== 1) return prevRows;
      const manualRow = manualRows[0];
      const formatted = totalAmountCents > 0 ? (totalAmountCents / 100).toFixed(2) : "";
      if (manualRow.paid === formatted) return prevRows;
      return prevRows.map((row) =>
        row.membershipId === manualRow.membershipId ? { ...row, paid: formatted } : row,
      );
    });
  }, [totalAmountCents]);

  useEffect(() => {
    if (!initialSelectionRef.current) return;
    const match = expenses.find((expense) => expense.id === initialSelectionRef.current);
    if (match) {
      setDetailExpense(match);
      initialSelectionRef.current = null;
    }
  }, [expenses]);

  const memberLookup = useMemo(
    () => new Map(members.map((member) => [member.membershipId, member])),
    [members],
  );

  // Calculate totalPaidCents from normalized rows (includes auto-distribution)
  const normalizedRowsForDisplay = distributeAutoPaid(
    rows.map((row) => ({
      ...row,
      weight: splitMode === "equal" ? "1" : row.weight,
    })),
    totalAmountCents
  );
  
  const totalPaidCents = normalizedRowsForDisplay.reduce((sum, row) => {
    const cents = parseCurrencyToCents(row.paid);
    return cents && cents > 0 ? sum + cents : sum;
  }, 0);

  const includedRows = rows.filter((row) => row.included);
  const selectedCount = includedRows.length;
  const totalWeight = includedRows.reduce((sum, row) => {
    const weight = Number(row.weight);
    return Number.isFinite(weight) && weight > 0 ? sum + weight : sum;
  }, 0);
  const perPersonCents = selectedCount > 0 ? Math.round(totalAmountCents / selectedCount) : 0;
  const allSelected = rows.every((row) => row.included);

  const sharePreviewMap = useMemo(() => {
    const map = new Map<string, number>();
    if (totalWeight <= 0 || totalAmountCents <= 0) return map;

    let distributed = 0;
    includedRows.forEach((row, index) => {
      const weight = Number(row.weight);
      if (!Number.isFinite(weight) || weight <= 0) return;
      let amount = Math.round((weight / totalWeight) * totalAmountCents);
      if (index === includedRows.length - 1) {
        amount = totalAmountCents - distributed;
      }
      distributed += amount;
      map.set(row.membershipId, amount);
    });
    return map;
  }, [includedRows, totalAmountCents, totalWeight]);

  const recentMembers = useMemo(() => {
    const map = new Map(members.map((member) => [member.membershipId, member]));
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const seen = new Set<string>();
    const result: GroupMemberInfo[] = [];
    for (const expense of sorted) {
      const ids = new Set<string>();
      expense.shares.forEach((share) => ids.add(share.membershipId));
      expense.payers.forEach((payer) => ids.add(payer.membershipId));
      ids.forEach((id) => {
        if (seen.has(id)) return;
        const member = map.get(id);
        if (member) {
          seen.add(id);
          result.push(member);
        }
      });
      if (result.length >= 6) break;
    }
    return result;
  }, [expenses, members]);

  const selectedPayerId = useMemo(() => {
    const paidEntries = rows.map((row) => ({
      membershipId: row.membershipId,
      cents: parseCurrencyToCents(row.paid) ?? 0,
    }));
    const exact = paidEntries.find(
      (entry) => entry.cents > 0 && entry.cents === totalAmountCents,
    );
    if (exact) return exact.membershipId;
    const largest = paidEntries.reduce<{
      membershipId: string;
      cents: number;
    } | null>((acc, entry) => {
      if (!acc || entry.cents > acc.cents) return entry;
      return acc;
    }, null);
    return largest && largest.cents > 0 ? largest.membershipId : null;
  }, [rows, totalAmountCents]);

  const handleRowChange = (
    membershipId: string,
    key: "paid" | "weight" | "included",
    value: string | boolean,
  ) => {
    updateRowsWithDistribution((prevRows) =>
      prevRows.map((row) => {
        if (row.membershipId !== membershipId) return row;
        if (key === "paid") {
          return {
            ...row,
            paid: String(value),
            autoPaid: false,
          };
        }
        if (key === "weight") {
          return {
            ...row,
            weight: String(value),
          };
        }
        const included = Boolean(value);
        return {
          ...row,
          included,
          weight: splitMode === "equal" && included ? "1" : row.weight,
          // Don't change autoPaid or paid when toggling inclusion
          autoPaid: row.autoPaid,
          paid: row.paid,
        };
      }),
      false // Don't force auto-distribution for manual row changes
    );
  };

  const toggleSelectAll = (select: boolean) => {
    updateRowsWithDistribution((prev) =>
      prev.map((row) => ({
        ...row,
        included: select,
        weight: splitMode === "equal" && select ? "1" : row.weight,
        // Don't change autoPaid or paid when toggling inclusion
        autoPaid: row.autoPaid,
        paid: row.paid,
      })),
      false // Don't force auto-distribution for select all
    );
  };

  const quickIncludeMember = (membershipId: string) => {
    updateRowsWithDistribution((prevRows) =>
      prevRows.map((row) => {
        if (row.membershipId !== membershipId) return row;
        return {
          ...row,
          included: true,
          weight: splitMode === "equal" ? "1" : row.weight.trim() || "1",
          // Don't change autoPaid or paid when including member
          autoPaid: row.autoPaid,
          paid: row.paid,
        };
      }),
      false // Don't force auto-distribution for quick include
    );
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    updateRowsWithDistribution((prev) => 
      prev.map((row) => ({ 
        ...row, 
        weight: mode === "equal" ? "1" : row.weight,
        // Only auto-distribute if no manual payer has been selected
        autoPaid: row.autoPaid, // Preserve current autoPaid state
        paid: row.paid, // Preserve current paid amounts
      })), 
      false // Don't force auto-distribution when switching modes
    );
  };

  const resetForm = () => {
    setDescription("");
    setTotalAmount("");
    setOccurredAt(todayInputValue());
    setRows(initialRows);
    setEditingExpenseId(null);
    setSplitMode("equal");
    setError(null);
    defaultPayerAppliedRef.current = false;
  };

  const handleReset = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Ensure auto-distribution is applied before validation
    const normalizedRows = distributeAutoPaid(
      rows.map((row) => ({
        ...row,
        weight: splitMode === "equal" ? "1" : row.weight,
      })),
      totalAmountCents
    );
    const included = normalizedRows.filter((row) => row.included);

    try {
      if (totalAmountCents <= 0) throw new Error("Enter a total greater than zero.");
      if (!description.trim()) throw new Error("Add a short description for the expense.");
      if (included.length === 0) throw new Error("Include at least one participant in the split.");

      const totalWeightNormalized = included.reduce((sum, row) => {
        const weight = Number(row.weight);
        return Number.isFinite(weight) && weight > 0 ? sum + weight : sum;
      }, 0);
      if (totalWeightNormalized <= 0) {
        throw new Error("Participant weights must total more than zero.");
      }
      const totalPaidNormalized = normalizedRows.reduce((sum, row) => {
        const cents = parseCurrencyToCents(row.paid);
        return (cents ?? 0) > 0 ? sum + (cents ?? 0) : sum;
      }, 0);
      
      
      if (Math.abs(totalPaidNormalized - totalAmountCents) > 1) {
        throw new Error(`Paid totals must match the total amount. Total: $${(totalAmountCents/100).toFixed(2)}, Paid: $${(totalPaidNormalized/100).toFixed(2)}`);
      }

      const payload = {
        description,
        totalAmount,
        currency,
        occurredAt,
        payers: normalizedRows
          .map((row) => ({ membershipId: row.membershipId, amount: row.paid }))
          .filter((payer) => (parseCurrencyToCents(payer.amount) ?? 0) > 0),
        shares: included
          .map((row) => ({ membershipId: row.membershipId, weight: Number(row.weight) }))
          .filter((share) => Number.isFinite(share.weight) && share.weight > 0),
      };

      const endpoint = editingExpenseId
        ? `/api/groups/${groupId}/expenses/${editingExpenseId}`
        : `/api/groups/${groupId}/expenses`;
      const method = editingExpenseId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to save expense");
      }

      const saved: ExpenseSummary = await response.json();
      setExpenses((prev) => {
        if (!editingExpenseId) return [saved, ...prev];
        return prev.map((expense) => (expense.id === editingExpenseId ? saved : expense));
      });
      dispatchExpensesUpdated();
      if (editingExpenseId) {
        setDetailExpense(saved);
        setCommentsRefreshKey((prev) => prev + 1);
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openForm = (expense?: ExpenseSummary) => {
    setDetailExpense(null);
    if (expense) {
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
            autoPaid: payerAmount === null || payerAmount === 0,
          };
        }),
      );

      const uniqueWeights = new Set(expense.shares.map((share) => share.weight.toFixed(4)));
      setSplitMode(uniqueWeights.size === 1 && uniqueWeights.has("1.0000") ? "equal" : "weighted");
      defaultPayerAppliedRef.current = true;
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const openDetail = (expense: ExpenseSummary) => {
    setDetailExpense(expense);
    setCommentsRefreshKey((prev) => prev + 1);
  };

  const closeDetail = () => {
    setDetailExpense(null);
  };

  const startDeleteExpense = (expense: ExpenseSummary) => {
    setListError(null);
    setPendingDeleteExpense(expense);
  };

  const cancelDeleteExpense = () => {
    if (deletingExpenseId) return;
    setPendingDeleteExpense(null);
  };

  const confirmDeleteExpense = async () => {
    if (!pendingDeleteExpense) return;

    const expenseId = pendingDeleteExpense.id;
    setListError(null);
    setDeletingExpenseId(expenseId);
    try {
      const response = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to delete expense.");
      }

      setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
      if (detailExpense?.id === expenseId) {
        closeDetail();
      }
      if (editingExpenseId === expenseId) {
        resetForm();
        setIsFormOpen(false);
      }
      setPendingDeleteExpense(null);
      dispatchExpensesUpdated();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to delete expense.");
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const openPayerModal = () => {
    payerBackupRef.current = rows.map((row) => ({ ...row }));
    setIsPayerModalOpen(true);
  };

  const closePayerModal = (restore = false) => {
    if (restore && payerBackupRef.current) {
      setRows(payerBackupRef.current.map((row) => ({ ...row })));
    }
    setIsPayerModalOpen(false);
    payerBackupRef.current = null;
  };

  const selectPayer = (membershipId: string) => {
    const formattedTotal = totalAmountCents > 0 ? (totalAmountCents / 100).toFixed(2) : "";
    defaultPayerAppliedRef.current = true;
    updateRowsWithDistribution((prevRows) =>
      prevRows.map((row) => {
        if (row.membershipId === membershipId) {
          return {
            ...row,
            paid: formattedTotal,
            autoPaid: false,
          };
        }
        return {
          ...row,
          paid: "",
          autoPaid: true,
        };
      }),
      false // Don't force auto-distribution for manual payer selection
    );
    closePayerModal(false);
  };

  const payerSummaryForForm = formatPayerSummaryFromRows(rows, memberLookup, sessionMemberId);
  const dispatchExpensesUpdated = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("group:expenses-updated", {
        detail: { groupId },
      }),
    );
  }, [groupId]);

  const refreshExpenses = useCallback(async () => {
    try {
      setIsExpensesRefreshing(true);
      const response = await fetch(`/api/groups/${groupId}/expenses`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to refresh expenses for this group.");
      }
      const payload = (await response.json()) as ExpenseSummary[];
      setExpenses(payload);
    } catch (error) {
      console.error("Failed to refresh expenses after membership update", error);
    } finally {
      setIsExpensesRefreshing(false);
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
        void refreshExpenses();
      }
    };
    window.addEventListener("group:expenses-updated", handler);
    return () => {
      window.removeEventListener("group:expenses-updated", handler);
    };
  }, [groupId, refreshExpenses]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-zinc-900">Expenses</h2>
          <span className="text-xs text-zinc-500">
            {expenses.length} item{expenses.length === 1 ? "" : "s"}
          </span>
          {isExpensesRefreshing ? (
            <span className="text-xs text-emerald-600">Refreshing…</span>
          ) : null}
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
        {listError ? <p className="mb-3 text-sm text-red-600">{listError}</p> : null}
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No expenses yet. Click &ldquo;Add expense&rdquo; to log the first one.
          </p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((expense) => {
              const payerSummary = formatPayerSummary(expense, sessionMemberId);
              const balance = formatBalanceText(
                expense,
                sessionMemberId,
                currency,
              );
              const formattedDate = new Date(expense.occurredAt).toLocaleDateString();
              return (
                <li key={expense.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(expense)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail(expense);
                      }
                    }}
                    className="flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-emerald-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          {formattedDate}
                        </p>
                        <h3 className="text-base font-semibold text-zinc-900">
                          {expense.description}
                        </h3>
                        <p className="text-sm text-zinc-600">{payerSummary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          {balance ? (
                            <p
                              className={`text-xs font-semibold ${
                                balance.type === "credit" ? "text-emerald-600" : "text-orange-600"
                              }`}
                            >
                              {balance.label}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            startDeleteExpense(expense);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={deletingExpenseId === expense.id}
                          className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={deletingExpenseId === expense.id ? "Deleting..." : "Delete expense"}
                        >
                          {deletingExpenseId === expense.id ? (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {detailExpense ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="h-full w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {new Date(detailExpense.occurredAt).toLocaleDateString()}
                </p>
                <h2 className="text-2xl font-semibold text-zinc-900">
                  {detailExpense.description}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeDetail();
                    openForm(detailExpense);
                  }}
                  className="rounded-md border border-zinc-200 p-2 text-zinc-500 transition hover:border-emerald-300 hover:text-emerald-600"
                  aria-label="Edit expense"
                  title="Edit expense"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.586 3.586a2 2 0 012.828 2.828l-8.25 8.25-3.536.707.707-3.536 8.25-8.25Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.5 5.5l3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <DetailSectionView
                title="Who paid"
                section={buildPayerSection(detailExpense)}
                currency={currency}
              />
              <DetailSectionView
                title="Split breakdown"
                section={buildShareSection(detailExpense, sessionMemberId, currency)}
                currency={currency}
              />
            </div>

            <div className="mt-6">
              <ExpenseComments
                key={`comments-${detailExpense.id}-${commentsRefreshKey}`}
                groupId={groupId}
                expenseId={detailExpense.id}
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const group = "Group";
                  await shareManager.shareExpense(detailExpense, group);
                }}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Share
              </button>
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              Track who paid and how the cost should be split using per-person weights.
            </p>

            {recentMembers.length > 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-sm">
                <p className="mb-2 font-medium text-emerald-700">Quick add members from recent activity</p>
                <div className="flex flex-wrap gap-2">
                  {recentMembers.map((member) => {
                    const row = rows.find((r) => r.membershipId === member.membershipId);
                    const active = row?.included ?? false;
                    return (
                      <button
                        key={member.membershipId}
                        type="button"
                        onClick={() => quickIncludeMember(member.membershipId)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          active ? "bg-emerald-600 text-white" : "border border-emerald-400 text-emerald-700 hover:bg-emerald-100"
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
                    Splitting {formatCurrency(totalAmountCents, currency)} across {selectedCount} participant
                    {selectedCount === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-700">Who paid?</p>
                    <p className="text-sm text-zinc-600">{payerSummaryForForm}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openPayerModal}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                  >
                    Change
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Totals must equal {formatCurrency(totalAmountCents, currency)}.
                </p>
              </div>

              <div className="border-b border-zinc-200 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {[
                      { key: "equal", label: "Split equally" },
                      { key: "weighted", label: "Weighted split" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => handleSplitModeChange(tab.key as SplitMode)}
                        className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                          splitMode === tab.key
                            ? "bg-emerald-600 text-white"
                            : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {splitMode === "equal" ? (
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(!allSelected)}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {splitMode === "equal"
                    ? "Select which people owe an equal share."
                    : "Set custom weights for each participant."}
                </p>
              </div>

              {splitMode === "equal" ? (
                <div className="mt-3 space-y-2">
                  <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                    {rows.map((row) => {
                      const member = memberLookup.get(row.membershipId) ?? null;
                      const active = row.included;
                      const initials =
                        member?.name?.[0]?.toUpperCase() ?? member?.email?.[0]?.toUpperCase() ?? "?";
                      const shareAmount = sharePreviewMap.get(row.membershipId) ?? 0;
                      return (
                        <li key={row.membershipId} className="flex items-center justify-between px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleRowChange(row.membershipId, "included", !row.included)
                            }
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${
                                active ? "bg-emerald-500" : "bg-zinc-300"
                              }`}
                            >
                              {initials}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900">
                                {displayName(member)}
                              </span>
                              {active && totalAmountCents > 0 ? (
                                <span className="text-xs text-zinc-500">
                                  {formatCurrency(shareAmount, currency)}
                                </span>
                              ) : null}
                            </div>
                          </button>
                          <input
                            type="checkbox"
                            checked={row.included}
                            onChange={(event) =>
                              handleRowChange(row.membershipId, "included", event.target.checked)
                            }
                            className="h-5 w-5"
                          />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-emerald-700">
                    <span>{formatCurrency(perPersonCents, currency)} / person</span>
                    <span>
                      {selectedCount} {selectedCount === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {rows.map((row) => {
                    const member = memberLookup.get(row.membershipId) ?? null;
                    const shareAmount = sharePreviewMap.get(row.membershipId) ?? 0;
                    return (
                      <div key={row.membershipId} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-3 text-sm font-medium text-zinc-900">
                            <input
                              type="checkbox"
                              checked={row.included}
                              onChange={(event) =>
                                handleRowChange(row.membershipId, "included", event.target.checked)
                              }
                              className="h-4 w-4"
                            />
                            {displayName(member)}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.weight}
                            onChange={(event) =>
                              handleRowChange(row.membershipId, "weight", event.target.value)
                            }
                            disabled={!row.included}
                            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                          />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          {row.included && totalAmountCents > 0 && totalWeight > 0
                            ? `Share: ${formatCurrency(shareAmount, currency)}`
                            : "Not included in split"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPayerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Select payer</h2>
              <button
                type="button"
                onClick={() => closePayerModal(true)}
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row) => {
                const member = memberLookup.get(row.membershipId) ?? null;
                const isSelected = row.membershipId === selectedPayerId;
                return (
                  <button
                    key={row.membershipId}
                    type="button"
                    onClick={() => selectPayer(row.membershipId)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200 bg-white hover:border-emerald-400"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-900">
                        {displayName(member)}
                      </span>
                      {totalAmountCents > 0 ? (
                        <span className="text-xs text-zinc-500">
                          Pays {formatCurrency(totalAmountCents, currency)}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        isSelected ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteExpense ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Delete expense</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-zinc-900">
                {pendingDeleteExpense.description}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-zinc-900">
                {formatCurrency(
                  pendingDeleteExpense.totalAmountCents,
                  pendingDeleteExpense.currency,
                )}
              </span>
              ? This action cannot be undone.
            </p>
            {listError ? <p className="mt-3 text-sm text-red-600">{listError}</p> : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelDeleteExpense}
                disabled={deletingExpenseId === pendingDeleteExpense.id}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteExpense()}
                disabled={deletingExpenseId === pendingDeleteExpense.id}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingExpenseId === pendingDeleteExpense.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const todayInputValue = () => new Date().toISOString().split("T")[0] ?? "";

const displayName = (member: GroupMemberInfo | null) => {
  if (member?.name) return member.name;
  if (member?.email) return member.email;
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
    if (rows[index].paid === value) return;
    next = rows.map((row) => ({ ...row }));
    next[index].paid = value;
  };

  const manualPaidCents = rows.reduce((sum, row) => {
    if (!row.included || row.autoPaid) return sum;
    const cents = parseCurrencyToCents(row.paid);
    if (!cents || cents <= 0) return sum;
    return sum + cents;
  }, 0);

  const amountToDistribute = totalAmountCents - manualPaidCents;
  const autoEntries = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.included && row.autoPaid);


  rows.forEach((row, idx) => {
    if (!row.included || amountToDistribute <= 0) {
      if (row.autoPaid && row.paid !== "") setPaid(idx, "");
    }
  });

  if (amountToDistribute <= 0 || autoEntries.length === 0) return next ?? rows;

  const distributable = Math.max(0, amountToDistribute);
  
  // Calculate total weight for auto-distribution
  const totalWeight = autoEntries.reduce((sum, { row }) => {
    const weight = Number(row.weight);
    return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1);
  }, 0);
  
  if (totalWeight <= 0) return next ?? rows;

  let distributed = 0;
  autoEntries.forEach(({ idx, row }, index) => {
    const weight = Number(row.weight);
    const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 1;
    
    let amount = Math.round((normalizedWeight / totalWeight) * distributable);
    
    // Ensure the last entry gets the remainder to avoid rounding errors
    if (index === autoEntries.length - 1) {
      amount = distributable - distributed;
    }
    
    distributed += amount;
    const formatted = amount > 0 ? (amount / 100).toFixed(2) : "";
    setPaid(idx, formatted);
  });

  return next ?? rows;
};

const formatPayerSummary = (expense: ExpenseSummary, sessionMemberId: string | null) => {
  if (expense.payers.length === 0) return "No payer recorded";
  const parts = expense.payers.map((payer) => {
    const name =
      sessionMemberId && payer.membershipId === sessionMemberId
        ? "You"
        : displayNameFromUser(payer.user);
    return `${name} paid ${formatCurrency(payer.amountCents, expense.currency)}`;
  });
  return parts.join(", ");
};

const formatBalanceText = (
  expense: ExpenseSummary,
  membershipId: string | null,
  currency: string,
): BalanceLabel | null => {
  if (!membershipId) return null;
  const paid = expense.payers
    .filter((payer) => payer.membershipId === membershipId)
    .reduce((sum, payer) => sum + payer.amountCents, 0);
  const share =
    expense.shares.find((share) => share.membershipId === membershipId)?.amountCents ?? 0;
  const net = paid - share;
  if (net > 0) return { type: "credit", label: `You lent ${formatCurrency(net, currency)}` };
  if (net < 0)
    return { type: "debit", label: `You owe ${formatCurrency(Math.abs(net), currency)}` };
  return null;
};

const buildPayerSection = (expense: ExpenseSummary): DetailSection => ({
  title: "Who paid",
  rows: expense.payers.map((payer) => ({
    name: displayNameFromUser(payer.user),
    amount: payer.amountCents,
  })),
});

const buildShareSection = (
  expense: ExpenseSummary,
  membershipId: string | null,
  currency: string,
): DetailSection => ({
  title: "Split breakdown",
  rows: expense.shares.map((share) => {
    const balance =
      membershipId && share.membershipId === membershipId
        ? formatBalanceText(expense, membershipId, currency)
        : null;
    return {
      name: displayNameFromUser(share.user),
      hint: balance?.label,
      amount: share.amountCents,
      highlight: membershipId === share.membershipId,
    };
  }),
});

const formatPayerSummaryFromRows = (
  rows: MemberRow[],
  memberLookup: Map<string, GroupMemberInfo>,
  sessionMemberId: string | null,
) => {
  const active = rows.filter((row) => (parseCurrencyToCents(row.paid) ?? 0) > 0);
  if (active.length === 0) return "Paid by you";
  const names = active.map((row) => {
    if (row.membershipId === sessionMemberId) return "you";
    const member = memberLookup.get(row.membershipId) ?? null;
    return displayName(member);
  });
  if (names.length === 1) return `Paid by ${names[0]}`;
  if (names.length === 2) return `Paid by ${names[0]} & ${names[1]}`;
  return `Paid by ${names[0]} +${names.length - 1}`;
};

function DetailSectionView({
  title,
  section,
  currency,
}: {
  title: string;
  section: DetailSection;
  currency: string;
}) {
  if (!section || section.rows.length === 0) return null;
  return (
    <section>
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <ul className="mt-2 space-y-2">
        {section.rows.map((row, index) => (
          <li
            key={`${row.name}-${index}`}
            className={`flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm ${
              row.highlight ? "bg-emerald-50" : "bg-white"
            }`}
          >
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900">
                {row.name}
                {row.highlight ? " (you)" : ""}
              </span>
              {row.hint ? <span className="text-xs text-zinc-500">{row.hint}</span> : null}
            </div>
            <span className="font-semibold text-zinc-700">
              {formatCurrency(row.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
