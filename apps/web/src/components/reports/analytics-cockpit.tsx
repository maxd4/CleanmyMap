"use client";

import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 Legend, 
 ResponsiveContainer, 
 LineChart, 
 Line,
 ComposedChart
} from"recharts";
import type { MonthlyAnalyticsPoint } from"@/lib/pilotage/analytics-data-utils";
import { useSitePreferences } from"../ui/site-preferences-provider";

type AnalyticsCockpitProps = {
 data: MonthlyAnalyticsPoint[];
};

export function AnalyticsCockpit({ data }: AnalyticsCockpitProps) {
 const { displayMode } = useSitePreferences();
 const isSober = displayMode ==="sobre";
 if (!data || data.length === 0) {
 return (
 <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 cmm-text-muted">
 <p className="cmm-text-small font-medium">Données analytiques insuffisantes pour générer les graphiques.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="grid gap-6 lg:grid-cols-1">
 <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <h3 className="text-lg font-bold cmm-text-primary mb-6 uppercase tracking-tight">Tendance de Masse & Mobilisation</h3>
 
 <div className="h-[400px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={data}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis 
 dataKey="month" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill:"#64748b", fontSize: 12 }} 
 dy={10}
 />
 <YAxis 
 yAxisId="left" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill:"#64748b", fontSize: 12 }} 
 />
 <YAxis 
 yAxisId="right" 
 orientation="right" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fill:"#64748b", fontSize: 12 }} 
 />
 <Tooltip 
 contentStyle={{ 
 borderRadius: isSober ?"4px" :"12px", 
 border: isSober ?"1px solid #cbd5e1" :"none", 
 boxShadow: isSober ?"none" :"0 10px 15px -3px rgb(0 0 0 / 0.1)",
 backgroundColor:"#fff"
 }} 
 />
 <Legend 
 verticalAlign="top" 
 align="right" 
 iconType={isSober ?"rect" :"circle"}
 wrapperStyle={{ paddingBottom:"20px" }}
 />
 <Bar 
 yAxisId="left" 
 dataKey="kg" 
 name="Masse (kg)" 
 fill={isSober ?"#475569" :"#10b981"} 
 radius={isSober ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
 barSize={isSober ? 30 : 40}
 />
 <Line 
 yAxisId="right" 
 type="monotone" 
 dataKey="volunteers" 
 name="Bénévoles" 
 stroke={isSober ?"#0f172a" :"#3b82f6"} 
 strokeWidth={isSober ? 2 : 3} 
 dot={isSober ? false : { r: 4, fill:"#3b82f6", strokeWidth: 2, stroke:"#fff" }}
 activeDot={{ r: 6 }}
 />
 </ComposedChart>
 </ResponsiveContainer>
 </div>
 
 <div className="mt-4 flex items-center justify-between cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
 <span>Axe Gauche : Masse récoltée</span>
 <span>Axe Droit : Participation unique</span>
 </div>
 </div>
 </div>
 </div>
 );
}
