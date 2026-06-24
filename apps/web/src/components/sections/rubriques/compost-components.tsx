"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Home, 
  Leaf, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ExternalLink,
  Zap,
} from "lucide-react";
import type {
  CompostGuideCard,
  CompostPoint,
  CompostRuleCard,
  CompostTerritoryLink,
  LocalizedText,
} from "@/lib/learning/compost-guide-data";
import { RubriqueCard } from "@/components/ui/rubrique-card";

const iconMap = {
  home: Home,
  users: Users,
  map: MapPin,
} as const;

export const CompostReflexGrid = memo(function CompostReflexGrid({ 
  cards, 
  fr 
}: { 
  cards: CompostGuideCard[],
  fr: boolean 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {cards.map((card, idx) => {
        const Icon = iconMap[card.icon as keyof typeof iconMap] || Leaf;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="group relative"
          >
            <RubriqueCard 
              themeColor="emerald"
              withTopBar={false}
              className="h-full"
            >
              <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-700">
                <Icon size={160} className="text-white" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                  <Icon size={28} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white tracking-tight mb-3">
                    {fr ? card.title.fr : card.title.en}
                  </h4>
                  <p className="text-slate-400 text-lg leading-relaxed font-medium">
                    {fr ? card.description.fr : card.description.en}
                  </p>
                </div>
              </div>
            </RubriqueCard>
          </motion.div>
        );
      })}
    </div>
  );
});

export const CompostRulesList = memo(function CompostRulesList({ 
  rules, 
  fr 
}: { 
  rules: CompostRuleCard[],
  fr: boolean 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {rules.map((rule, idx) => (
        <RubriqueCard 
          key={idx} 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          themeColor="emerald"
          withTopBar={false}
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap size={100} className="text-white rotate-12" />
          </div>
          
          <h4 className="text-emerald-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            {fr ? rule.title.fr : rule.title.en}
          </h4>
          <ul className="space-y-4">
            {rule.items.map((item, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.05) }}
                className="flex items-start gap-4 text-slate-300 group/item"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">
                  <CheckCircle2 size={12} />
                </div>
                <span className="text-lg font-medium leading-relaxed">{fr ? item.fr : item.en}</span>
              </motion.li>
            ))}
          </ul>
        </RubriqueCard>
      ))}
    </div>
  );
});

export const CompostStepCards = memo(function CompostStepCards({ 
  steps, 
  fr 
}: { 
  steps: Array<{
    title: LocalizedText;
    body: LocalizedText;
  }>, 
  fr: boolean 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {steps.map((step, idx) => (
        <motion.div 
          key={idx} 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/20">
              {idx + 1}
            </span>
            <h5 className="font-black text-white text-lg tracking-tight">{fr ? step.title.fr : step.title.en}</h5>
          </div>
          <p className="text-slate-400 text-base leading-relaxed pl-12 font-medium">
            {fr ? step.body.fr : step.body.en}
          </p>
        </motion.div>
      ))}
    </div>
  );
});

export const OfficialMapsList = memo(function OfficialMapsList({ 
  links, 
  fr 
}: { 
  links: CompostTerritoryLink[],
  fr: boolean 
}) {
  return (
    <div className="space-y-6">
      {links.map((link, idx) => (
        <motion.a
          key={idx}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="block group"
        >
          <RubriqueCard 
            themeColor="emerald"
            withTopBar={false}
            className="p-6 transition-all duration-500 hover:border-emerald-500/50"
          >
            <div className="flex justify-between items-start gap-6">
              <div className="space-y-2">
                <h5 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                  {fr ? link.title.fr : link.title.en}
                </h5>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  {fr ? link.description.fr : link.description.en}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 text-slate-500 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
                <ExternalLink size={20} />
              </div>
            </div>
          </RubriqueCard>
        </motion.a>
      ))}
    </div>
  );
});

export const SelectedPointsGrid = memo(function SelectedPointsGrid({ 
  points, 
  fr 
}: { 
  points: CompostPoint[], 
  fr: boolean 
}) {
  return (
    <div className="space-y-6">
      {points.map((point, idx) => (
        <RubriqueCard 
          key={point.id} 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
          themeColor="emerald"
          withTopBar={false}
          className="p-6 hover:border-emerald-500/30 transition-all group"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-3">
              <div>
                <h5 className="text-lg font-black text-white tracking-tight">{fr ? point.name.fr : point.name.en}</h5>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 font-medium">
                  <MapPin size={14} className="text-emerald-500/50" />
                  {point.address} • {point.city}
                </p>
              </div>
              <a
                href={point.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-black text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                {fr ? point.sourceLabel.fr : point.sourceLabel.en}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20">
              {point.region === "paris" ? "Paris" : point.region === "petite_couronne" ? (fr ? "Petite Couronne" : "Inner Ring") : (fr ? "Grande Couronne" : "Outer Ring")}
            </span>
          </div>
        </RubriqueCard>
      ))}
    </div>
  );
});
