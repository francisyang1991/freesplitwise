"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DebtData {
  userId: string;
  name: string;
  netCents: number;
  formatted: string;
  isDebt: boolean;
}

interface DebtCarrierChartProps {
  data: DebtData[];
  currency: string;
}

export function DebtCarrierChart({ data, currency }: DebtCarrierChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        No debt data available
      </div>
    );
  }

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(value) / 100);
  };


  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={(value) => formatTooltipValue(value)}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip 
            formatter={(value: number, name, props) => [
              formatTooltipValue(value), 
              props.payload.isDebt ? "Owes" : "Owed"
            ]}
            labelFormatter={(label) => `Person: ${label}`}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />
          <Bar 
            dataKey="netCents" 
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
