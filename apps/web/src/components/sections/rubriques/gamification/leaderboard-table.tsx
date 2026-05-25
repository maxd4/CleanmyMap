import React from "react";
import type { IndividualItem, CollectiveItem } from "./gamification-types";
import { cn } from "@/lib/utils";
import { Trophy, Users, ShieldCheck, Zap, Sparkles } from "lucide-react";

interface LeaderboardTableProps {
  rows: Array<IndividualItem | CollectiveItem>;
  scope: "individual" | "collective";
  loading: boolean;
  error: unknown;
}

export function LeaderboardTable({ rows, scope, loading, error }: LeaderboardTableProps) {
  const individualRows = rows as IndividualItem[];
  const collectiveRows = rows as CollectiveItem[];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-6">
        <Zap className="text-red-500 animate-pulse" size={40} />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">
          Synchronisation du moteur...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 flex flex-col items-center gap-6 text-red-400">
        <ShieldCheck size={40} className="opacity-50" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Moteur de classement indisponible
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl shadow-2xl relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Trophy size={100} className="text-white" />
      </div>

      <div className="overflow-x-auto relative z-10">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {scope === "individual" ? (
                <>
                  <th className="px-8 py-6 w-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Rank</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Identité</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Niv.</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">XP Validée</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Qualité</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Score</th>
                </>
              ) : (
                <>
                  <th className="px-8 py-6 w-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Rank</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Collectif</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Membres</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Actions</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Qualité</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Score</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {scope === "individual"
              ? individualRows.map((row) => (
                  <tr
                    key={`${row.userId}-${row.rank}`}
                    className="hover:bg-white/[0.03] transition-all group cursor-default"
                  >
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-xl text-xs font-black tracking-tight border",
                        row.rank === 1 ? "bg-red-500 text-slate-950 border-red-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]" :
                        row.rank === 2 ? "bg-slate-400/20 text-slate-200 border-slate-400/30" :
                        row.rank === 3 ? "bg-red-600/20 text-red-400 border-red-600/30" :
                        "bg-white/5 text-slate-500 border-white/5"
                      )}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-black text-white tracking-tight group-hover:text-red-400 transition-colors">
                          {row.actorName}
                        </span>
                        {row.associationName && (
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <Users size={10} className="text-red-500" />
                            {row.associationName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:border-red-500/20 transition-colors">
                        <Sparkles size={10} className="text-red-500" />
                        Lvl {row.currentLevel}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-base font-black text-red-400 tracking-tighter">
                          {row.xpValidated.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">XP points</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 italic">
                        <ShieldCheck size={10} className="text-red-500" />
                        {row.qualityAverage}%
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-lg font-black text-white tracking-tighter shadow-sm">
                        {row.score.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))
              : collectiveRows.map((row) => (
                  <tr
                    key={`${row.associationName}-${row.rank}`}
                    className="hover:bg-white/[0.03] transition-all group cursor-default"
                  >
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-xl text-xs font-black tracking-tight border",
                        row.rank === 1 ? "bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]" :
                        row.rank === 2 ? "bg-slate-400/20 text-slate-200 border-slate-400/30" :
                        row.rank === 3 ? "bg-red-600/20 text-red-400 border-red-600/30" :
                        "bg-white/5 text-slate-500 border-white/5"
                      )}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                         <span className="text-base font-black text-white tracking-tight group-hover:text-red-400 transition-colors">
                           {row.associationName}
                         </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                        {row.members} <span className="text-slate-600">p.</span>
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                        {row.validatedActions} <span className="text-slate-600">act.</span>
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 italic">
                        <ShieldCheck size={10} className="text-red-400" />
                        {row.qualityAverage}%
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-lg font-black text-white tracking-tighter">
                        {row.score.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-8 py-32 text-center" colSpan={6}>
                  <div className="flex flex-col items-center gap-6 opacity-40">
                    <Sparkles size={48} className="text-slate-500" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] max-w-xs leading-relaxed mx-auto italic">
                      Aucune donnée qualifiée disponible pour cette catégorie.
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
