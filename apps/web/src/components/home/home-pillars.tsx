"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Network,
  Shield,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { HomeIconName } from "@/lib/home/config";

interface Pillar {
  iconName: HomeIconName;
  title: string;
  preview: {
    mobile: string[];
    desktop: string[];
  };
  iconBg: string;
  iconColor: string;
  accent: string;
  ring: string;
  dot: string;
  href: string;
}

interface HomePillarsProps {
  pillars: Pillar[];
}

const ICONS: Record<HomeIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  zap: Zap,
  map: MapIcon,
  target: Target,
  network: Network,
  "book-open": BookOpen,
  "map-pin": MapPin,
  "bar-chart-3": BarChart3,
  users: Users,
  "file-text": FileText,
  shield: Shield,
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export function HomePillars({ pillars }: HomePillarsProps) {
  return (
    <section className="relative w-full overflow-hidden px-3 py-16 sm:px-5 sm:py-20 lg:px-8 lg:py-24">
      {/* fond travaillé cohérent avec le site */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0b2040] to-[#082a1e] dark:from-slate-950 dark:via-[#060f20] dark:to-[#041710]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_20%,rgba(34,211,238,0.07),transparent),radial-gradient(ellipse_50%_60%_at_10%_80%,rgba(16,185,129,0.07),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* en-tête */}
        <div className="mb-10 space-y-2 text-center px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            style={{ textWrap: "pretty" }}
          >
            Les sept piliers de CleanMyMap
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="cmm-text-small font-light text-white/55 sm:text-base mx-auto max-w-2xl leading-relaxed"
          >
            Agir, visualiser, apprendre et piloter vos initiatives
            environnementales.
          </motion.p>
        </div>

        {/* Grille flexible pour garantir le centrage des éléments orphelins (7 items) */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap justify-center gap-4 px-4"
        >
          {pillars.map((bloc) => (
            <Link
              key={bloc.title}
              href={bloc.href}
              className={`group relative flex w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${bloc.accent} ring-1 ${bloc.ring} p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-2xl hover:shadow-black/40 active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-[calc(50%-1rem)] md:w-[calc(33.333%-1.1rem)] xl:w-[calc(25%-1.2rem)]`}
            >
              <motion.div variants={item} className="h-full flex flex-col">
                {/* coin accent dot */}
                <span
                  className={`absolute right-5 top-5 h-2 w-2 rounded-full ${bloc.dot} opacity-60 group-hover:opacity-100 transition-opacity`}
                />

                {/* icône */}
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${bloc.iconBg} ${bloc.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-lg`}
                >
                  {(() => {
                    const Icon = ICONS[bloc.iconName];
                    return <Icon size={24} />;
                  })()}
                </div>

                {/* titre */}
                <h3 className="mb-2 text-base font-bold text-white leading-tight">
                  {bloc.title}
                </h3>

                {/* description — 2 lignes max */}
                <p
                  className="flex-1 text-[13px] leading-relaxed text-white/60 group-hover:text-white/80 transition-colors"
                  style={{ textWrap: "pretty" }}
                >
                  {bloc.preview.desktop.length === 0 ? (
                    "Rubriques en cours de configuration."
                  ) : (
                    <>
                      <span className="sm:hidden">
                        {bloc.preview.mobile.join(", ")}
                      </span>
                      <span className="hidden sm:inline">
                        {bloc.preview.desktop.join(", ")}
                      </span>
                    </>
                  )}
                </p>

                {/* lien */}
                <div
                  className={`mt-5 flex items-center gap-2 cmm-text-caption font-bold uppercase tracking-widest ${bloc.iconColor} opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap`}
                >
                  Accéder{" "}
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
