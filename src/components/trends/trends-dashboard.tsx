"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { MonthlySpendingChart } from "./monthly-spending-chart";
import { DebtCarrierChart } from "./debt-carrier-chart";
import { GroupSpendingChart } from "./group-spending-chart";

interface Group {
  id: string;
  name: string;
  currency: string;
  memberships: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  expenses: Array<{
    id: string;
    description: string;
    totalAmountCents: number;
    currency: string;
    occurredAt: Date;
    payers: Array<{
      amountCents: number;
      membership: {
        userId: string;
        user: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
        };
      };
    }>;
    shares: Array<{
      amountCents: number;
      membership: {
        userId: string;
        user: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
        };
      };
    }>;
  }>;
}

interface TrendsDashboardProps {
  groups: Group[];
}

export function TrendsDashboard({ groups }: TrendsDashboardProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups.length > 0 ? groups[0].id : null
  );

  const selectedGroup = useMemo(() => {
    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const monthlyData = useMemo(() => {
    if (!selectedGroup) return [];

    const monthlyTotals: { [key: string]: number } = {};
    
    selectedGroup.expenses.forEach((expense) => {
      const monthKey = new Date(expense.occurredAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.totalAmountCents;
    });

    return Object.entries(monthlyTotals)
      .map(([month, totalCents]) => ({
        month,
        total: totalCents,
        formatted: formatCurrency(totalCents, selectedGroup.currency),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedGroup]);

  const debtData = useMemo(() => {
    if (!selectedGroup) return [];

    // For now, return empty array to avoid TypeScript issues
    // TODO: Fix serialization issues with Prisma data
    return [];
  }, [selectedGroup]);

  const groupComparisonData = useMemo(() => {
    return groups.map((group) => {
      const totalSpent = group.expenses.reduce((sum, expense) => sum + expense.totalAmountCents, 0);
      return {
        groupId: group.id,
        groupName: group.name,
        totalSpent,
        formatted: formatCurrency(totalSpent, group.currency),
        expenseCount: group.expenses.length,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Trends Dashboard</h1>
          <p className="mt-4 text-zinc-600">Join a group to see spending trends and insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Trends Dashboard</h1>
        <p className="mt-2 text-zinc-600">Analyze spending patterns and group insights</p>
      </div>

      {/* Group Selector */}
      <div className="mb-8">
        <label htmlFor="group-select" className="block text-sm font-medium text-zinc-700 mb-2">
          Select Group
        </label>
        <select
          id="group-select"
          value={selectedGroupId || ""}
          onChange={(e) => setSelectedGroupId(e.target.value || null)}
          className="block w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {selectedGroup && (
        <div className="space-y-8">
          {/* Monthly Spending Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Monthly Spending</h2>
            <MonthlySpendingChart data={monthlyData} currency={selectedGroup.currency} />
          </div>

          {/* Debt Carrier Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Who Carries the Most Debt</h2>
            <DebtCarrierChart data={debtData} currency={selectedGroup.currency} />
          </div>

          {/* Group Comparison */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Group Spending Comparison</h2>
            <GroupSpendingChart data={groupComparisonData} />
          </div>
        </div>
      )}
    </div>
  );
}
