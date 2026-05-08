"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, Sparkles, Leaf, Copy, Check,
  Cigarette, Trash2, Droplets, Eye, Info, Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

const CAMPAIGN_THEMES = [
  {
    id: "megots",
    icon: Cigarette,
    color: "amber",
    title: "Mégots",
    messages: [
      "Un mégot pollue 500L d'eau. 1 minute pour le ramasser, 500 ans pour le détruire.",
      "Le mégot n'est pas un déchet, c'est un polluant. #MégotStop",
      "Chaque matin, 30 millions de mégots finissent dans la nature.",
      "Un geste simple : le cendrier de poche. Un impact immense.",
    ],
    hashtags: ["#MégotStop", "#CleanMyMap", "#StopPollution"],
  },
  {
    id: "impacts",
    icon: Leaf,
    color: "emerald",
    title: "Impacts",
    messages: [
      "1 personne qui ramasse = 100 déchets qui ne le seront plus.",
      "Ce n'est pas une question de quantité, c'est une question de comportement.",
      "Un ramassage inspire 10 autres personnes. Le geste compte.",
      "La propreté commence par un geste. Le vôtre.",
    ],
    hashtags: ["#UnGestePourLaPlanète", "#JeRamasse"],
  },
  {
    id: "creatifs",
    icon: Sparkles,
    color: "rose",
    title: "Créatifs",
    messages: [
      "La nature n'est pas une poubelle. Agissez.",
      "Votre déchet, votre responsabilité. Votre geste, votre fierté.",
      "Le respect se ramasse, il ne se jette pas.",
      "Soyez le changement que vous voulez voir dans la rue.",
    ],
    hashtags: ["#BeChange", "#ÉcoResponsabilité"],
  },
];

const STATS_CARDS = [
  { icon: Trash2, value: "1M", label: "tonnes/an", color: "slate" },
  { icon: Cigarette, value: "30Mrd", label: "mégots/an", color: "amber" },
  { icon: Droplets, value: "500L", label: "eau/mégot", color: "blue" },
  { icon: Eye, value: "78%", label: "concernés", color: "rose" },
];

export function CampaignsSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState(0);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-12">
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/20">
            <Megaphone size={32} />
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white uppercase tracking-[0.05em]">Kit Campagnes</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Prêts-à-partager pour sensibiliser</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 relative z-10">
           <div className="h-1 w-12 rounded-full bg-slate-800" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opérationnel Terrain</p>
        </div>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {STATS_CARDS.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/20 backdrop-blur-3xl text-center shadow-xl hover:bg-white/[0.03] transition-all group"
          >
            <div className={cn(
              "mx-auto mb-4 p-2.5 rounded-xl border w-fit transition-transform group-hover:scale-110",
              stat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              stat.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
              stat.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-slate-500/10 border-slate-500/20 text-slate-400'
            )}>
               <stat.icon size={18} />
            </div>
            <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2 group-hover:text-slate-400 transition-colors">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Theme Selector */}
      <div className="flex flex-wrap gap-3 p-2 bg-slate-950/40 rounded-3xl w-fit border border-white/5 shadow-inner">
        {CAMPAIGN_THEMES.map((theme, i) => (
          <button
            key={theme.id}
            onClick={() => setActiveTheme(i)}
            className={cn(
              "relative px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500",
              activeTheme === i ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="relative z-10">{theme.title}</span>
            {activeTheme === i && (
              <motion.div 
                layoutId="active-theme-bg"
                className="absolute inset-0 bg-rose-600 rounded-2xl shadow-2xl shadow-rose-600/40"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Messages Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTheme}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="grid gap-6"
        >
          {CAMPAIGN_THEMES[activeTheme].messages.map((msg, i) => {
            const msgId = `${CAMPAIGN_THEMES[activeTheme].id}-${i}`;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-rose-500/30 transition-all duration-500 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-8">
                  <p className="text-lg font-bold text-slate-200 leading-relaxed group-hover:text-white transition-colors">{msg}</p>
                  <button
                    onClick={() => copyToClipboard(msg, msgId)}
                    className="shrink-0 h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white border border-white/5 shadow-xl transform translate-x-4 group-hover:translate-x-0"
                  >
                    {copiedId === msgId ? <Check size={20} className="animate-in zoom-in" /> : <Copy size={20} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
          
          <div className="flex flex-wrap gap-3 pt-6">
            {CAMPAIGN_THEMES[activeTheme].hashtags.map((tag, i) => (
              <span key={i} className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 uppercase tracking-widest hover:bg-rose-500/20 transition-colors cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Tip Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-[3rem] border border-amber-500/20 bg-amber-500/5 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-6 group overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 relative z-10 shadow-2xl shadow-amber-500/20">
          <Sparkles size={28} className="animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-300 leading-relaxed max-w-2xl relative z-10">
          <strong className="text-amber-400 uppercase tracking-widest text-[10px] block mb-1">Boostez votre impact</strong> 
          Partagez ces messages avec vos propres photos de ramassage pour inspirer votre entourage et démultiplier l&apos;impact de vos actions !
        </p>
        <div className="ml-auto relative z-10 hidden md:block">
           <Share2 size={48} className="text-white opacity-5" />
        </div>
      </motion.div>
    </div>
  );
}