"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Trash2, Users } from "lucide-react";

interface ActionPoint {
  id: string;
  date: string;
  label: string;
  wasteKg: number;
  volunteers: number;
  type: string;
}

interface EcologicalTimelineProps {
  actions: ActionPoint[];
}

export function EcologicalTimeline({ actions }: EcologicalTimelineProps) {
  // Sort actions by date descending
  const sortedActions = [...actions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10); // Show only last 10 for performance/visuals

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-transparent">
      {sortedActions.map((action, idx) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
        >
          {/* Dot */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-md shadow-emerald-500/20 absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10 group-hover:scale-125 transition-transform duration-300">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              action.wasteKg > 10 ? "bg-emerald-500 animate-pulse" : "bg-blue-400"
            )} />
          </div>

          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <time className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {format(new Date(action.date), "dd MMMM yyyy", { locale: fr })}
              </time>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <MapPin size={12} className="text-blue-400" />
                {action.type}
              </div>
            </div>
            
            <h4 className="text-lg font-black cmm-text-primary mb-4 leading-tight">
              {action.label}
            </h4>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Trash2 size={14} className="text-emerald-500" />
                <span className="text-xs font-bold cmm-text-primary">{action.wasteKg}kg</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Users size={14} className="text-blue-500" />
                <span className="text-xs font-bold cmm-text-primary">{action.volunteers}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
