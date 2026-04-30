"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";
import type { HomeIconName } from "@/lib/accueil/config";

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
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function HomeBenefits({ benefits }: HomeBenefitsProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[linear-gradient(180deg,#071425_0%,#071123_60%,#071223_100%)] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(39,195,217,0.09),transparent),radial-gradient(ellipse_50%_40%_at_10%_100%,rgba(24,182,143,0.08),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-2 sm:px-4">
        <div className="mb-10 space-y-3 text-center sm:mb-12">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.34em] text-cyan-300/70">
            Bénéfices
          </p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            style={{ textWrap: "pretty" }}
          >
            Pourquoi utiliser CleanMyMap ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-base font-light leading-relaxed text-white/66 sm:text-lg"
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
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {benefits.map((benefit) => (
            <motion.article
              key={benefit.title}
              variants={item}
              className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(14,28,49,0.88)] p-5 shadow-[0_20px_40px_-24px_rgba(2,6,23,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-white/16 hover:shadow-2xl"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${benefit.border} bg-white/8 shadow-lg ${benefit.color}`}
              >
                {(() => {
                  const Icon = ICONS[benefit.iconName];
                  return <Icon size={24} />;
                })()}
              </div>
              <h3 className="mb-3 text-lg font-bold leading-tight text-white">
                {benefit.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-white/64">
                {benefit.desc}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
