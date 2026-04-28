"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";

export function HomeHero() {
  return (
    <header className="relative overflow-hidden pt-16 pb-32 sm:pt-20 sm:pb-40 lg:pt-28 lg:pb-48">
      {/* ── couche 1 : fond de base ─────────────────────────────────── */}
      <div className="absolute inset-0 bg-[#0b1f3a] dark:bg-[#07111f]" />

      {/* ── couche 2 : dégradé directionnel riche ───────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a52] via-[#0d5570] to-[#0d6e50] opacity-90 dark:opacity-80" />

      {/* ── couche 3 : glow radial contrôlé ────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(34,211,238,0.18),transparent),radial-gradient(ellipse_50%_50%_at_0%_100%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(34,211,238,0.10),transparent),radial-gradient(ellipse_50%_50%_at_0%_100%,rgba(16,185,129,0.08),transparent)]" />

      {/* ── couche 4 : texture grain (svg data-uri) ─────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
        }}
      />

      {/* ── couche 5 : logo watermark droit ─────────────────────────── */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[640px] h-[640px] opacity-[0.05] dark:opacity-[0.03] select-none hidden lg:block">
        <Image
          src="/brand/logo-cleanmymap-officiel.svg"
          alt=""
          fill
          sizes="(min-width: 1024px) 640px, 0px"
          className="object-contain"
          priority
        />
      </div>

      {/* ── contenu ──────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {/* carte glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-20 space-y-10"
          >
            {/* sélecteur langue */}
            <div className="flex justify-start">
              <SitePreferencesControls variant="locale" />
            </div>

            {/* titre principal */}
            <div className="space-y-4 sm:space-y-5">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-bold text-white tracking-tighter leading-[0.95]"
                style={{ fontSize: "clamp(3.5rem, 12vw, 7.5rem)" }}
              >
                Clean My Map
              </motion.h1>

              {/* slogan en sous-titre */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="flex items-center gap-3 pt-1 sm:gap-4"
              >
                <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-emerald-500/50 to-transparent" />
                <p className="rounded-full border border-emerald-300/25 bg-emerald-950/40 px-3 py-1 cmm-text-caption sm:cmm-text-caption md:cmm-text-small font-bold uppercase tracking-[0.34em] text-emerald-300/95 whitespace-nowrap">
                  Dépolluer <span className="mx-1 opacity-30">·</span>{" "}
                  Cartographier <span className="mx-1 opacity-30">·</span>{" "}
                  Impacter
                </p>
              </motion.div>
            </div>

            {/* paragraphe */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="max-w-3xl text-lg sm:text-xl text-white/92 leading-[1.65] font-light pt-2"
            >
              Mutualisez vos cleanwalks, visualisez les zones prioritaires sur une carte commune et générez des rapports d&apos;impact automatisés pour votre RSE, les collectivités et les élus. <span className="italic opacity-90">Cultivons l&apos;entraide.</span>
            </motion.p>

            {/* CTA Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 sm:gap-4 pt-2"
            >
              {/* PRIMAIRE 1 : Consulter la carte */}
              <Link
                href="/actions/map"
                className="group inline-flex w-full sm:w-auto h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 text-base font-bold text-emerald-950 shadow-[0_8px_32px_-6px_rgba(16,185,129,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-8px_rgba(16,185,129,0.4)] active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b2a52] whitespace-nowrap"
              >
                Voir la carte
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              {/* PRIMAIRE 2 : Déclarer une action */}
              <Link
                href="/actions/new"
                className="group inline-flex w-full sm:w-auto h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 text-base font-bold text-white shadow-[0_8px_32px_-6px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-8px_rgba(6,182,212,0.6)] hover:from-cyan-400 hover:to-emerald-400 active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b2a52] whitespace-nowrap"
              >
                Déclarer une action
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              {/* SECONDAIRE 0 : Explorer le plan du site */}
              <Link
                href="/explorer"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/8 px-7 cmm-text-small font-bold uppercase tracking-wider text-white transition-all duration-300 hover:border-cyan-300/50 hover:bg-white/15 hover:text-cyan-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 whitespace-nowrap"
              >
                Explorer
                <ArrowRight size={16} />
              </Link>

              {/* SECONDAIRE 1 : Se connecter (Plus visible) */}
              <Link
                href="/sign-in"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-8 text-base font-bold text-white transition-all duration-300 hover:border-white/80 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 whitespace-nowrap"
              >
                Se connecter
              </Link>

              {/* SECONDAIRE 2 : Rapport d'impact */}
              <Link
                href="/reports"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 cmm-text-small font-bold text-white/90 transition-all duration-300 hover:border-white/30 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 whitespace-nowrap"
              >
                Voir l'impact
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
