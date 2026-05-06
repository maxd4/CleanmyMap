"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, Sparkles, Leaf, Copy, Check,
  Cigarette, Trash2, Droplets, Eye, Info
} from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 bg-white/50 backdrop-blur-md border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner ring-1 ring-rose-500/20">
            <Megaphone size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900">Kit Campagnes</h3>
            <p className="text-sm font-medium text-slate-500">Prêts-à-partager pour sensibiliser</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS_CARDS.map((stat, i) => (
          <div key={i} className="p-4 rounded-[2rem] bg-white border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
            <stat.icon size={20} className={`mx-auto mb-2 text-${stat.color}-500 opacity-70`} />
            <p className="text-xl font-black text-slate-900 leading-none">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        {CAMPAIGN_THEMES.map((theme, i) => (
          <button
            key={theme.id}
            onClick={() => setActiveTheme(i)}
            className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${
              activeTheme === i
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {theme.title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTheme}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className="grid gap-4"
        >
          {CAMPAIGN_THEMES[activeTheme].messages.map((msg, i) => {
            const msgId = `${CAMPAIGN_THEMES[activeTheme].id}-${i}`;
            return (
              <div
                key={i}
                className="group relative p-5 rounded-[2rem] bg-white border border-slate-100 hover:border-rose-200 transition-all shadow-sm hover:shadow-lg hover:shadow-rose-100/20"
              >
                <p className="text-base font-medium text-slate-700 pr-12 leading-relaxed">{msg}</p>
                <button
                  onClick={() => copyToClipboard(msg, msgId)}
                  className="absolute top-1/2 -translate-y-1/2 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 hover:text-rose-600 shadow-sm"
                >
                  {copiedId === msgId ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
              </div>
            );
          })}
          
          <div className="flex flex-wrap gap-2 pt-2">
            {CAMPAIGN_THEMES[activeTheme].hashtags.map((tag, i) => (
              <span key={i} className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="p-5 rounded-[2.5rem] bg-amber-50 border border-amber-100 flex items-start gap-4">
        <div className="mt-0.5 p-2 bg-amber-100 rounded-xl text-amber-600">
          <Info size={20} />
        </div>
        <p className="text-sm font-bold text-amber-900 leading-relaxed">
          <strong>Boostez votre impact</strong> : Partagez ces messages avec vos propres photos de ramassage pour inspirer votre entourage !
        </p>
      </div>
    </div>
  );
}