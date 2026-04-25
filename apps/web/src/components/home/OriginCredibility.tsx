"use client";

import React from 'react';
import { Map, Users, GraduationCap, CheckCircle2, Construction, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Variants } from "framer-motion";

export function OriginCredibility() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardHover = {
    y: -5,
    transition: {
      duration: 0.2,
      ease: "easeInOut" as const
    }
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-950 to-slate-900 text-slate-50">
      {/* Effets de lumière pour la profondeur */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" as const }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-400/15 rounded-full blur-[140px] pointer-events-none" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" as const, delay: 0.2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-full blur-[120px] pointer-events-none" 
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* En-tête de section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20 text-center md:text-left"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight bg-gradient-to-r from-emerald-200 via-emerald-100 to-white bg-clip-text text-transparent">
              Origine, terrain et crédibilité
            </h2>
            <p className="text-xl md:text-2xl text-emerald-100/90 max-w-4xl leading-relaxed font-light">
              CleanMyMap est un projet étudiant construit autour d’actions terrain réelles, 
              porté par une ambition partenariale progressive et une rigueur universitaire.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-stretch">
            {/* Bloc Gauche : L'Histoire (Glassmorphism Emerald) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group relative backdrop-blur-2xl bg-emerald-400/5 border border-emerald-400/20 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl transition-all hover:bg-emerald-400/10"
            >
              <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                <div className="p-3 md:p-4 bg-emerald-400/20 rounded-xl md:rounded-2xl shadow-inner">
                  <GraduationCap className="text-emerald-300 w-7 h-7 md:w-9 md:h-9" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white">L&apos;histoire du projet</h3>
              </div>

              <div className="space-y-6 md:space-y-8 text-emerald-50/90 text-base md:text-xl leading-relaxed font-light">
                <p>
                  Né au sein du <strong className="font-bold text-white">DU Engagement de Sorbonne Université</strong>, 
                  ce projet transforme l&apos;engagement citoyen en un outil de pilotage concret pour le territoire.
                </p>
                <p>
                  Notre objectif est de structurer, cartographier et valoriser les actions de dépollution 
                  pour offrir une visibilité inédite sur l&apos;impact environnemental local.
                </p>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-4 md:gap-5 p-5 md:p-6 bg-emerald-950/60 rounded-[1.2rem] md:rounded-[1.5rem] border border-emerald-500/30 text-emerald-200 text-sm md:text-base italic leading-relaxed"
                >
                  <Construction className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-1 text-emerald-400" />
                  <span>
                    Plateforme en développement continu, enrichie chaque jour par les retours de nos utilisateurs sur le terrain.
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* Bloc Droite : Preuves & Crédibilité */}
            <div className="flex flex-col justify-between py-2 md:py-6">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-10 md:space-y-12"
              >
                {[
                  {
                    icon: CheckCircle2,
                    title: "Actions terrain documentées",
                    desc: "Chaque point sur notre carte représente une action réelle, vérifiée et géolocalisée."
                  },
                  {
                    icon: GraduationCap,
                    title: "Cadre Sorbonne Université",
                    desc: "Un projet académique sérieux garantissant une approche méthodologique rigoureuse."
                  },
                  {
                    icon: Users,
                    title: "Écosystème en construction",
                    desc: "Partenariats progressifs avec les associations locales et les acteurs publics franciliens."
                  }
                ].map((item, index) => (
                  <motion.div key={index} variants={itemVariants} className="flex gap-6 md:gap-8 items-start group">
                    <div className="mt-1 p-2.5 md:p-3 bg-emerald-400/20 rounded-lg md:rounded-xl shadow-lg group-hover:bg-emerald-400/30 transition-colors">
                      <item.icon className="text-emerald-300 w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl md:text-2xl font-black mb-2 md:mb-3 text-white">{item.title}</h4>
                      <p className="text-emerald-100/70 text-base md:text-lg leading-relaxed font-light">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 md:gap-5 mt-12 md:mt-16"
              >
                <Link href="/actions/map" className="group flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all rounded-2xl text-base md:text-lg font-black shadow-xl shadow-emerald-500/20 active:scale-95">
                  <Map className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110" /> Voir la carte
                </Link>
                <Link href="/sections/annuaire" className="flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-white/10 hover:bg-white/15 transition-all rounded-2xl text-base md:text-lg font-bold border border-white/20 backdrop-blur-md text-white active:scale-95">
                  Annuaire partenaires
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Mini-Timeline */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { step: 1, title: "Création du projet", desc: "Lancement au sein du DU Engagement de Sorbonne Université pour structurer la donnée terrain.", highlight: false },
              { step: 2, title: "Premières actions", desc: "Validation des protocoles de ramassage et mise en place de la cartographie interactive.", highlight: false },
              { step: 3, title: "Développement", desc: "Extension aux banlieues, automatisation des rapports et renforcement des outils d'IA.", highlight: true },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                whileHover={cardHover}
                className={`p-10 rounded-[2rem] border transition-all duration-300 ${item.highlight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-emerald-500/40'} relative group`}
              >
                <div className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Calendar className="w-4 h-4" /> Étape {item.step}
                </div>
                <h5 className="text-2xl font-black mb-4 text-white group-hover:text-emerald-200 transition-colors">{item.title}</h5>
                <p className="text-emerald-100/70 text-base leading-relaxed font-light">
                  {item.desc}
                </p>
                {item.highlight && (
                  <div className="absolute top-6 right-6">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Transition douce vers le footer pour corriger l'illisibilité en fin de page */}
      <div className="h-32 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent mt-16" />
    </section>
  );
}