"use client";

import { motion } from "framer-motion";
import { Bell, Copy, CheckCircle2, Clock, AlertTriangle, Info } from "lucide-react";
import type { EventReminder } from "@/lib/community/engagement";
import { cn } from "@/lib/utils";

type CommunityRemindersCardProps = {
  reminders: EventReminder[];
  onCopyReminderMessage: (message: string) => Promise<void>;
};

function CommunityRemindersCard(props: CommunityRemindersCardProps) {
  const { reminders, onCopyReminderMessage } = props;

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/20">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Relances prioritaires</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Optimisation RSVP & Engagement</p>
          </div>
        </div>

        <ul className="space-y-4">
          {reminders.map((reminder, i) => (
            <motion.li
              key={reminder.eventId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group/item relative rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-6 transition-all duration-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    reminder.priority === "haute" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                    reminder.priority === "moyenne" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    {reminder.priority === "haute" && <AlertTriangle size={10} className="inline mr-1" />}
                    Priorité {reminder.priority}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">J-{reminder.daysToEvent}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => void onCopyReminderMessage(reminder.message)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 opacity-0 group-hover/item:opacity-100"
                >
                  <Copy size={12} />
                  Copier
                </button>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/40 border border-white/5 mb-4">
                <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                  &ldquo;{reminder.reason}&rdquo;
                </p>
              </div>

              <div className="relative p-4 rounded-2xl bg-white/[0.03] border border-white/5 group-hover/item:border-white/10 transition-colors">
                <p className="text-sm font-medium text-slate-300 leading-relaxed">
                  {reminder.message}
                </p>
              </div>
            </motion.li>
          ))}

          {reminders.length === 0 ? (
            <motion.li 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center rounded-3xl border border-dashed border-white/10"
            >
              <CheckCircle2 size={32} className="mx-auto text-emerald-500/30 mb-4" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Aucune relance prioritaire
              </p>
              <p className="text-xs font-medium text-slate-600 mt-2">
                Tout est sous contrôle pour les 14 prochains jours.
              </p>
            </motion.li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export { CommunityRemindersCard };
