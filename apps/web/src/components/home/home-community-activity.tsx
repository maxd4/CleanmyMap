"use client";

import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, MapPin, Sparkles, Users } from "lucide-react";

const RECENT_ACTIVITIES = [
  {
    id: 1,
    user: "Léa G.",
    action: "a collecté 12kg de déchets",
    location: "Paris 11e",
    time: "Il y a 12 min",
    avatar: "https://i.pravatar.cc/150?u=lea",
    type: "impact",
  },
  {
    id: 2,
    user: "Association CleanUp",
    action: "organise une action samedi",
    location: "Canal St-Martin",
    time: "Il y a 45 min",
    avatar: "https://i.pravatar.cc/150?u=cleanup",
    type: "event",
  },
  {
    id: 3,
    user: "Marc D.",
    action: "a signalé un nouveau point noir",
    location: "Bois de Vincennes",
    time: "Il y a 2h",
    avatar: "https://i.pravatar.cc/150?u=marc",
    type: "report",
  },
];

export function HomeCommunityActivity() {
  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left: Content */}
          <div className="flex-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50"
            >
              <Sparkles size={16} />
              <span className="cmm-text-caption font-bold uppercase tracking-wider">Le pouls du réseau</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold cmm-text-primary leading-[1.1] tracking-tight"
            >
              Une communauté <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">vivante et engagée</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg cmm-text-secondary leading-relaxed max-w-xl"
            >
              Rejoignez des milliers de citoyens et d'associations qui agissent quotidiennement pour un territoire plus propre. Coordonnez vos actions et partagez vos victoires.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                   <Users size={20} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold cmm-text-primary">+1,200</p>
                  <p className="cmm-text-caption cmm-text-muted">Membres actifs</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                   <MessageSquare size={20} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-bold cmm-text-primary">850</p>
                  <p className="cmm-text-caption cmm-text-muted">Discussions/mois</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Visual Modules (Floating Activity Feed) */}
          <div className="flex-1 relative w-full max-w-xl">
            {/* Decorative Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative space-y-4">
              {RECENT_ACTIVITIES.map((activity, idx) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                  className="flex items-center gap-4 p-4 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 border border-white/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 backdrop-blur-xl group hover:scale-[1.02] transition-all cursor-default"
                >
                  <div className="relative">
                    <img
                      src={activity.avatar}
                      alt={activity.user}
                      className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                      {activity.type === 'impact' && <Sparkles size={10} className="text-amber-500" />}
                      {activity.type === 'event' && <Users size={10} className="text-indigo-500" />}
                      {activity.type === 'report' && <MapPin size={10} className="text-rose-500" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold cmm-text-primary truncate">{activity.user}</p>
                      <p className="cmm-text-caption cmm-text-muted flex-shrink-0">{activity.time}</p>
                    </div>
                    <p className="text-sm cmm-text-secondary line-clamp-1">
                      {activity.action} <span className="font-semibold text-indigo-500">@{activity.location}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart size={14} className="text-rose-500" />
                    <span className="text-[10px] font-bold">12</span>
                  </div>
                </motion.div>
              ))}

              {/* Floating Mini Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 animate-bounce-slow"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Share2 size={20} />
                </div>
                <div>
                   <p className="text-xs font-bold cmm-text-primary">+45 partages</p>
                   <p className="text-[10px] cmm-text-muted">Aujourd'hui</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
