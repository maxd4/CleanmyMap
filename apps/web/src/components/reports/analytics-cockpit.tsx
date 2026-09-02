"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
} from "recharts";
import { AnalyticsCockpitEmptyState } from "@/components/reports/analytics-cockpit-empty-state";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";

type AnalyticsCockpitProps = {
  data: MonthlyAnalyticsPoint[];
};

export function AnalyticsCockpit({ data }: AnalyticsCockpitProps) {
  if (!data || data.length === 0) {
    return <AnalyticsCockpitEmptyState />;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-600">Masse collectée (kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-600">Bénévoles</span>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
              contentStyle={{ 
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 28px -18px rgba(15,23,42,0.35)",
                backgroundColor: "#ffffff",
                padding: "10px 12px",
              }}
              itemStyle={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}
              labelStyle={{ color: "#64748b", marginBottom: "6px", fontSize: "10px", fontWeight: 700 }}
            />
            <Line
              yAxisId="left" 
              type="monotone"
              dataKey="kg"
              name="Masse collectée (kg)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="volunteers" 
              name="Bénévoles" 
              stroke="#2499e9"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2499e9", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
