"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  MapPin,
  Map as MapIcon,
  Network,
  Shield,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { HomeIconName } from "@/lib/home/config";

interface Benefit {
  iconName: HomeIconName;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

interface HomeBenefitsProps {
  benefits: Benefit[];
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function HomeBenefits({ benefits }: HomeBenefitsProps) {
  return (
    <section className="relative w-full overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      <div className="absolute inset-0 cmm-surface" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,116,144,0.06),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,211,238,0.04),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-12 space-y-3 text-center">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            Bénéfices
          </p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight cmm-text-primary sm:text-4xl lg:text-5xl dark:text-white"
            style={{ textWrap: "pretty" }}
          >
            Pourquoi utiliser CleanMyMap ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-base font-light cmm-text-muted sm:text-lg dark:cmm-text-muted leading-relaxed"
          >
            Un seul outil pour structurer, mesurer et valoriser vos actions
            terrain.
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={item}
              className={`flex flex-col rounded-[2rem] border ${benefit.border} ${benefit.bg} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:hover:shadow-black/50`}
            >
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/5 ${benefit.color}`}
              >
                {(() => {
                  const Icon = ICONS[benefit.iconName];
                  return <Icon size={28} />;
                })()}
              </div>
              <h3 className="mb-3 text-lg font-bold cmm-text-primary dark:text-white">
                {benefit.title}
              </h3>
              <p
                className="cmm-text-small leading-relaxed cmm-text-secondary dark:cmm-text-muted"
                style={{ textWrap: "pretty" }}
              >
                {benefit.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
