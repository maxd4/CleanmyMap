"use client";

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { toFrNumber, toFrInt } from '../reports/web-document/analytics';
import type { NameType, ValueType } from"recharts/types/component/DefaultTooltipContent";

type DataEntry = {
 area: string;
 actions: number;
 kg: number;
 butts: number;
 volunteers: number;
};

type Props = {
 data: DataEntry[];
 title?: string;
};

const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7'];

export function ZoneRepartitionChart({ data, title }: Props) {
 const [metric, setMetric] = useState<'actions' | 'kg' | 'butts' | 'volunteers'>('actions');

 const chartData = useMemo(() => {
 const sorted = [...data].sort((a, b) => b[metric] - a[metric]);
 const top = sorted.slice(0, 6);
 const others = sorted.slice(6);
 
 if (others.length > 0) {
 const othersTotal = others.reduce((acc, curr) => acc + curr[metric], 0);
 top.push({
 area: 'Autres',
 [metric]: othersTotal,
 } as any);
 }
 return top;
 }, [data, metric]);

 const totalValue = useMemo(() => chartData.reduce((acc, curr) => acc + (curr[metric] as number), 0), [chartData, metric]);
 const tooltipFormatter = (value?: ValueType, name?: NameType): [string, string] => {
 const numericValue =
 typeof value ==="number"
 ? value
 : typeof value ==="string"
 ? Number(value)
 : Array.isArray(value) && typeof value[0] ==="number"
 ? value[0]
 : 0;
 const safeTotal = totalValue > 0 ? totalValue : 1;
 const label = typeof name ==="string" ? name : String(name ??"");
 return [
 `${toFrNumber(numericValue)} (${((numericValue / safeTotal) * 100).toFixed(1)}%)`,
 label,
 ];
 };

 return (
 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
 <div>
 <h3 className="text-lg font-bold cmm-text-primary">{title ||"Répartition territoriale"}</h3>
 <p className="cmm-text-small cmm-text-muted">Par arrondissement (Paris) ou ville</p>
 </div>
 
 <select 
 value={metric} 
 onChange={(e) => setMetric(e.target.value as any)}
 className="bg-slate-50 border border-slate-300 cmm-text-secondary cmm-text-small rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
 >
 <option value="actions">Nombre d&apos;actions</option>
 <option value="kg">Déchets (kg)</option>
 <option value="butts">Mégots</option>
 <option value="volunteers">Bénévoles</option>
 </select>
 </div>

 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={chartData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={100}
 paddingAngle={5}
 dataKey={metric}
 nameKey="area"
 >
 {chartData.map((_, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip 
 formatter={tooltipFormatter}
 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
 />
 <Legend verticalAlign="bottom" height={36}/>
 </PieChart>
 </ResponsiveContainer>
 </div>

 <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
 {chartData.slice(0, 4).map((item) => (
 <div key={item.area}>
 <p className="cmm-text-caption uppercase tracking-wider cmm-text-muted font-bold">{item.area}</p>
 <p className="text-lg font-semibold cmm-text-primary">
 {metric === 'actions' || metric === 'volunteers' ? toFrInt(item[metric]) : toFrNumber(item[metric])}
 <span className="cmm-text-caption ml-1 font-normal cmm-text-muted">
 {metric === 'kg' ? 'kg' : ''}
 </span>
 </p>
 </div>
 ))}
 </div>
 </div>
 );
}