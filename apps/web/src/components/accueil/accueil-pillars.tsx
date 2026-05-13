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
import type { HomeIconName } from "@/lib/accueil/config";

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
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function HomePillars({ pillars }: HomePillarsProps) {
  return (
    <section className="relative w-full overflow-hidden px-3 py-16 sm:px-5 sm:py-20 lg:px-8 lg:py-24">
      {/* fond travaillé cohérent avec le site - Design Mixte */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-sky-50/30 to-emerald-50/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_20%,rgba(34,211,238,0.1),transparent),radial-gradient(ellipse_50%_60%_at_10%_80%,rgba(16,185,129,0.1),transparent)]" />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        {/* en-tête */}
        <div className="mb-14 space-y-3 px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
             className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.02] tracking-[-0.03em] text-slate-900"
            style={{ textWrap: "pretty" }}
          >
            Les sept piliers de CleanMyMap
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
             className="mx-auto max-w-2xl text-[15px] font-medium leading-relaxed text-slate-600 sm:text-base"
          >
            Agir, visualiser, apprendre et piloter vos initiatives
            environnementales.
          </motion.p>
        </div>

        {/* Cartes centrées : 4 + 3 sur desktop, 2 colonnes sur tablette, 1 sur mobile */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap justify-center gap-5 px-4"
        >
          {pillars.map((bloc) => (
            <Link
              key={bloc.title}
              href={bloc.href}
              className={`group relative flex min-h-[216px] w-full flex-col overflow-hidden rounded-[0.9rem] bg-gradient-to-br ${bloc.accent} ring-1 ${bloc.ring} p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-2xl hover:shadow-black/40 active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]`}
            >
              <motion.div variants={item} className="flex h-full min-h-[168px] flex-col">
                {/* coin accent dot */}
                <span
                  className={`absolute right-5 top-5 h-2 w-2 rounded-full ${bloc.dot} opacity-60 group-hover:opacity-100 transition-opacity`}
                />

                {/* icône */}
                <div
                  className={`mb-6 flex h-12 w-12 items-center justify-center rounded-[0.9rem] ${bloc.iconBg} ${bloc.iconColor} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  {(() => {
                    const Icon = ICONS[bloc.iconName];
                    return <Icon size={24} />;
                  })()}
                </div>

                {/* titre */}
                <h3 className="mb-3 text-[17px] font-black leading-tight text-slate-900">
                  {bloc.title}
                </h3>

                {/* description — 2 lignes max */}
                <p
                  className="line-clamp-2 flex-1 text-[13px] leading-[1.65] text-slate-600 transition-colors group-hover:text-slate-800"
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
                  className={`mt-7 flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.14em] ${bloc.iconColor} opacity-80 transition-opacity group-hover:opacity-100`}
                >
                  Accéder{" "}
                  <ArrowRight
                    size={13}
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
