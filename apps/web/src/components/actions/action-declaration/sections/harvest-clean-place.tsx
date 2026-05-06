"use client";

import { MapPin } from "lucide-react";

export function HarvestCleanPlaceSection() {
  return (
    <section className="rounded-[2rem] border border-sky-100 bg-sky-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-sky-600" />
            <p className="text-[10px] font-black tracking-widest text-sky-800 uppercase">
              Déclarer un lieu propre
            </p>
          </div>
          <p className="mt-1 text-xs font-medium text-sky-900/70">
            Ce mode enregistre un point déjà propre. Les champs déchets et mégots sont masqués, la photo et le contexte restent disponibles.
          </p>
        </div>
        <div className="rounded-full border border-sky-200 bg-white px-3 py-2 text-[10px] font-black text-sky-700 shadow-sm">
          Mode lieu propre
        </div>
      </div>
      <div className="mt-4 rounded-[1.6rem] border border-sky-100 bg-white/80 px-4 py-3">
        <p className="text-[10px] font-black tracking-widest text-sky-800 uppercase">
          Point d&apos;entrée
        </p>
        <p className="mt-1 text-sm font-semibold text-sky-900">
          Renseigne le lieu puis ajoute des photos ou une note pour documenter le point propre.
        </p>
      </div>
    </section>
  );
}
