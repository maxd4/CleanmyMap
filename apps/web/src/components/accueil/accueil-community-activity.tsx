"use client";

import { motion } from "framer-motion";
import { MessageSquare, Share2, Sparkles, Users } from "lucide-react";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";

type HomeCommunityActivityProps = {
  activity: HomeCommunityActivitySummary;
};

const TONE_STYLES: Record<
  HomeCommunityActivitySummary["items"][number]["tone"],
  string
> = {
  amber: "bg-amber-400/12 text-amber-200 ring-amber-200/20",
  blue: "bg-sky-400/12 text-sky-200 ring-sky-200/20",
  cyan: "bg-cyan-300/12 text-cyan-100 ring-cyan-200/20",
  emerald: "bg-emerald-300/12 text-emerald-100 ring-emerald-200/20",
};

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function HomeCommunityActivity({
  activity,
}: HomeCommunityActivityProps) {
  return (
    <section className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_38%_at_18%_18%,rgba(39,195,217,0.12),transparent),radial-gradient(ellipse_45%_42%_at_84%_60%,rgba(88,94,207,0.10),transparent)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/10 px-4 py-2 text-cyan-200"
          >
            <Sparkles size={16} />
            <span className="cmm-text-caption font-bold uppercase tracking-[0.3em]">
              Le pouls du réseau
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="max-w-xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl"
          >
            Une communauté <br />
            <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              vivante et engagée
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-xl text-lg leading-relaxed text-white/66"
          >
            Les dernières actions remontent ici depuis les données du terrain.
            Rien d&apos;inventé, seulement des actions vérifiées et récentes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="rounded-xl bg-white/8 p-2">
                <Users size={18} className="text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {formatCount(activity.visibleActions)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">
                  Actions visibles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="rounded-xl bg-white/8 p-2">
                <MessageSquare size={18} className="text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {formatCount(activity.distinctLocations)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">
                  Lieux distincts
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative w-full flex-1 lg:max-w-xl">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/12 blur-[120px]" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-400/10 blur-[100px]" />

          <div className="relative space-y-4">
            {activity.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-[1.5rem] border border-white/10 bg-[rgba(12,24,44,0.9)] p-5 shadow-[0_18px_36px_-24px_rgba(2,6,23,0.8)]"
              >
                <p className="text-sm font-bold text-white">
                  Aucune action terrain récente vérifiée.
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Les prochaines données validées apparaîtront ici.
                </p>
              </motion.div>
            ) : null}

            {activity.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[rgba(12,24,44,0.9)] p-4 shadow-[0_18px_36px_-24px_rgba(2,6,23,0.8)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              >
                <div className="relative">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold ring-1 ${TONE_STYLES[item.tone]}`}
                    aria-hidden="true"
                  >
                    {item.initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full border border-white/10 bg-[#0d1f33] p-1">
                    <Users size={10} className="text-cyan-300" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white">
                      {item.actor}
                    </p>
                    <p className="flex-shrink-0 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      {item.timeLabel}
                    </p>
                  </div>
                  <p className="truncate text-sm text-white/66">
                    {item.action}{" "}
                    <span className="font-semibold text-cyan-200">
                      @{item.location}
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.65 }}
              className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(12,24,44,0.95)] px-4 py-3 shadow-[0_18px_36px_-24px_rgba(2,6,23,0.8)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Share2 size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {formatCount(activity.visibleActions)} actions visibles
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                  Données terrain
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
