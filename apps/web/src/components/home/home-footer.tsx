"use client";

import { Instagram, Mail } from "lucide-react";

export function HomeFooter() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/5 bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-br from-[#061a14] via-slate-950 to-slate-950 opacity-90" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center justify-between gap-12 lg:flex-row lg:gap-8">
          {/* Gauche : Contact discret */}
          <div className="flex flex-col items-center lg:items-start space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-emerald-500/60" />
              <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-emerald-400">
                Contact
              </p>
            </div>
            <p className="text-base text-slate-300 font-light text-center lg:text-left">
              Une question ou un partenariat ? Échangeons.
            </p>
          </div>

          {/* Centre : Liens de contact compacts */}
          <div className="flex flex-wrap justify-center gap-5">
            <a
              href="mailto:maxence.drm@gmail.com"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 transition-all hover:border-emerald-500/40 hover:bg-white/10 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                <Mail size={18} className="text-emerald-400" />
              </div>
              <span className="cmm-text-small font-bold text-slate-200 group-hover:text-white transition-colors">
                maxence.drm@gmail.com
              </span>
            </a>
            <a
              href="https://instagram.com/max_drm4"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 transition-all hover:border-pink-500/40 hover:bg-white/10 hover:shadow-lg hover:shadow-pink-500/5"
            >
              <div className="p-2 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-colors">
                <Instagram size={18} className="text-pink-400" />
              </div>
              <span className="cmm-text-small font-bold text-slate-200 group-hover:text-white transition-colors">
                @max_drm4
              </span>
            </a>
          </div>

          {/* Droite : Slogan, Mantra & Copyright unifiés sur une ligne desktop */}
          <div className="flex flex-col items-center text-center lg:items-end lg:text-right space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
              <p className="text-base sm:text-lg font-bold tracking-tight text-white uppercase whitespace-nowrap">
                Dépolluer <span className="text-cyan-400/50">·</span>{" "}
                Cartographier <span className="text-emerald-400/50">·</span>{" "}
                Impacter
              </p>
              <span className="hidden lg:block h-6 w-px bg-white/10" />
              <div className="flex items-center justify-center gap-4">
                <p className="cmm-text-caption font-bold tracking-[0.25em] text-emerald-400/90 uppercase whitespace-nowrap">
                  Cultivons l&apos;entraide
                </p>
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <p className="cmm-text-caption font-medium cmm-text-muted/80 uppercase tracking-widest whitespace-nowrap">
                  © 2026 CleanMyMap
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
