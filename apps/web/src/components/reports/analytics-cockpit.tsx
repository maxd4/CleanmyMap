"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";

type AnalyticsCockpitProps = {
  data: MonthlyAnalyticsPoint[];
};

export function AnalyticsCockpit({ data }: AnalyticsCockpitProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-[3rem] bg-white/[0.02] border-2 border-dashed border-white/10 text-center p-12 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-2">
          Analyse en attente
        </p>
        <p className="text-[10px] font-bold text-white/20 max-w-[240px] leading-relaxed uppercase tracking-widest">
          Le flux de données mensuel sera généré dès que les premières actions seront archivées.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Masse & Mobilisation</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Masse (kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Bénévoles</span>
          </div>
        </div>
      </div>
      
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 900 }} 
              dy={15}
            />
            <YAxis 
              yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 900 }} 
              dx={-10}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 900 }} 
              dx={10}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ 
                borderRadius: "24px", 
                border: "1px solid rgba(255,255,255,0.1)", 
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                backgroundColor: "#000",
                padding: "20px"
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              labelStyle={{ color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontSize: '10px', fontWeight: 900 }}
            />
            <Bar 
              yAxisId="left" 
              dataKey="kg" 
              name="Masse" 
              fill="#10b981" 
              radius={[12, 12, 0, 0]} 
              barSize={45}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="volunteers" 
              name="Bénévoles" 
              stroke="#0ea5e9" 
              strokeWidth={4} 
              dot={{ r: 6, fill: "#0ea5e9", strokeWidth: 3, stroke: "#000" }}
              activeDot={{ r: 8, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-8 border-t border-white/5 pt-8">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Flux Annuel Consolidé</p>
      </div>
    </div>
  );
}
