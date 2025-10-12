"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MonthlyData {
  month: string;
  total: number;
  formatted: string;
}

interface MonthlySpendingChartProps {
  data: MonthlyData[];
  currency: string;
}

export function MonthlySpendingChart({ data, currency }: MonthlySpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        No spending data available
      </div>
    );
  }

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value / 100);
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tickFormatter={formatMonth}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={(value) => formatTooltipValue(value)}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip 
            formatter={(value: number) => [formatTooltipValue(value), "Total Spent"]}
            labelFormatter={(label) => `Month: ${formatMonth(label)}`}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />
          <Bar 
            dataKey="total" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
