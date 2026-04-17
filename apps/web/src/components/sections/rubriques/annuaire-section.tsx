"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { ExternalLink, Megaphone, Clock, MapPin, Building2, HeartHandshake, Trees, Building, Map as MapIcon, Users, Calendar } from "lucide-react";
import type { AnnuaireEntry } from "./annuaire-map-canvas";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((mod) => mod.AnnuaireMapCanvas),
  { ssr: false, loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Chargement de la carte...</div> }
);

type EngagementType = "environnemental" | "social" | "humanitaire";
type EntityKind = "association" | "groupe_parole" | "evenement" | "commerce" | "entreprise";

// Vraies données géolocalisées d'acteurs de l'engagement à Paris
const INITIAL_ENTRIES: AnnuaireEntry[] = [
  {
    id: "asso-1",
    name: "Pik Pik Environnement",
    kind: "association",
    types: ["environnemental", "social"],
    description: "Accompagne concrètement les franciliens à la transition écologique (ateliers zéro déchet).",
    location: "Issy-les-Moulineaux",
    lat: 48.825,
    lng: 2.270,
    websiteUrl: "https://www.pikpik.org/",
    instagramUrl: "https://www.instagram.com/pikpik_environnement/",
    contactLabel: "Découvrir",
  },
  {
    id: "com-1",
    name: "Le Carillon / La Cloche",
    kind: "association",
    types: ["social", "humanitaire"],
    description: "Réseau de commerçants solidaires offrant des services aux personnes sans domicile.",
    location: "Paris Centre",
    lat: 48.860,
    lng: 2.350,
    websiteUrl: "https://lacloche.org/le-carillon",
    instagramUrl: "https://www.instagram.com/assolacloche/",
    contactLabel: "Devenir solidaire",
  },
  {
    id: "com-2",
    name: "La Textilerie",
    kind: "commerce",
    types: ["environnemental", "social"],
    description: "Tiers-lieu dédié à la mode éco-responsable : friperie, ateliers de couture.",
    location: "Paris 10e",
    lat: 48.875,
    lng: 2.360,
    websiteUrl: "https://latextilerie.fr/",
    instagramUrl: "https://www.instagram.com/latextilerieparis/",
    contactLabel: "Boutique",
  },
  {
    id: "asso-2",
    name: "Carton Plein",
    kind: "association",
    types: ["social", "environnemental"],
    description: "Favorise l'inclusion sociale et le réemploi (déménagements à vélo).",
    location: "Paris 11e / 18e",
    lat: 48.890,
    lng: 2.355,
    websiteUrl: "https://www.cartonplein.org/",
    instagramUrl: "https://www.instagram.com/cartonplein_org/",
    contactLabel: "Soutenir",
  },
  {
    id: "groupe-1",
    name: "Cercle de parole - Éco-anxiété",
    kind: "groupe_parole",
    types: ["environnemental", "social"],
    description: "Espace d'échange bienveillant pour partager ses ressentis face à l'urgence climatique.",
    location: "Paris (Itinérant)",
    lat: 48.865,
    lng: 2.340,
    contactLabel: "S'inscrire",
  },
  {
    id: "asso-3",
    name: "La Collecterie Paris",
    kind: "commerce",
    types: ["environnemental", "social"],
    description: "Ressourcerie locale, pôle de réemploi d'objets et ateliers d'upcycling.",
    location: "Montreuil",
    lat: 48.860,
    lng: 2.430,
    websiteUrl: "https://lacollecterie.org/",
    instagramUrl: "https://www.instagram.com/lacollecterie/",
    contactLabel: "Visiter",
  },
  {
    id: "evt-1",
    name: "La REcyclerie - Ateliers",
    kind: "evenement",
    types: ["environnemental"],
    description: "Tiers-lieu, ferme urbaine, réparation d'objets, conférences écologiques.",
    location: "Paris 18e",
    lat: 48.896,
    lng: 2.344,
    websiteUrl: "https://www.larecyclerie.com/",
    instagramUrl: "https://www.instagram.com/larecyclerie/",
    contactLabel: "Programme",
  },
  {
    id: "ent-1",
    name: "Green Flex",
    kind: "entreprise",
    types: ["environnemental"],
    description: "Entreprise de conseil accompagnant d'autres entreprises dans leur transition.",
    location: "Paris 9e",
    lat: 48.874,
    lng: 2.333,
    contactLabel: "En savoir plus",
  }
];

// Simulations de Micros-Besoins Urgents
const MICRO_BESOINS = [
  {
    id: "mb-1",
    actor: "Carton Plein",
    title: "Besoin de 3 déménageurs à vélo",
    urgency: "Samedi matin",
    location: "Paris 18e",
  },
  {
    id: "mb-2",
    actor: "La Cloche",
    title: "Collecte de produits d'hygiène",
    urgency: "Toute la semaine",
    location: "Paris Centre",
  },
  {
    id: "mb-3",
    actor: "La REcyclerie",
    title: "Aide pour le potager urbain",
    urgency: "Dimanche 14h",
    location: "Porte de Clignancourt",
  }
];

const ENGAGEMENT_FILTERS: { value: EngagementType | "all"; label: string; icon: any }[] = [
  { value: "all", label: "Tous", icon: MapIcon },
  { value: "environnemental", label: "Environnemental", icon: Trees },
  { value: "social", label: "Social", icon: Users },
  { value: "humanitaire", label: "Humanitaire", icon: HeartHandshake },
];

const KIND_FILTERS: { value: EntityKind | "all"; label: string; icon: any }[] = [
  { value: "all", label: "Tout le réseau", icon: MapIcon },
  { value: "association", label: "Associations", icon: Users },
  { value: "entreprise", label: "Entreprises", icon: Building2 },
  { value: "commerce", label: "Commerçants", icon: Building },
  { value: "groupe_parole", label: "Groupes & Collectifs", icon: Users },
  { value: "evenement", label: "Événements/Lieux", icon: Calendar },
];

export function AnnuaireSection() {
  const { user } = useUser();
  const [filterType, setFilterType] = useState<EngagementType | "all">("all");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");

  const sortedAndFilteredEntries = useMemo(() => {
    const filtered = INITIAL_ENTRIES.filter((entry) => {
      const matchType = filterType === "all" || entry.types.includes(filterType);
      const matchKind = filterKind === "all" || entry.kind === filterKind;
      return matchType && matchKind;
    });

    const rawRole = (user?.publicMetadata?.role || user?.privateMetadata?.role || "benevole") as string;
    const isDecideur = rawRole === "elu" || rawRole === "admin";

    return filtered.sort((a, b) => {
      if (isDecideur) {
        if ((a.kind === "commerce" || a.kind === "entreprise") && (b.kind !== "commerce" && b.kind !== "entreprise")) return -1;
        if ((b.kind === "commerce" || b.kind === "entreprise") && (a.kind !== "commerce" && a.kind !== "entreprise")) return 1;
      } else {
        if (a.kind === "association" && b.kind !== "association") return -1;
        if (b.kind === "association" && a.kind !== "association") return 1;
      }
      return 0;
    });
  }, [filterType, filterKind, user]);

  return (
    <div className="space-y-6">
      
      {/* Barre de filtres immersive */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-nowrap overflow-x-auto custom-scrollbar gap-2">
          {KIND_FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = filterKind === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterKind(f.value as any)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon size={16} /> {f.label}
              </button>
            )
          })}
        </div>

        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex overflow-x-auto custom-scrollbar gap-2">
           {ENGAGEMENT_FILTERS.map((f) => {
            const isActive = filterType === f.value;
            return (
              <button
                key={`eng-${f.value}`}
                onClick={() => setFilterType(f.value as any)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'}`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne MAP : Carte interactive */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-600" /> 
              Carte du réseau engagé
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{sortedAndFilteredEntries.length} résultats</span>
          </div>
          
          <div className="flex-1 shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200">
             {/* Dynamic leaflet map */}
             <AnnuaireMapCanvas items={sortedAndFilteredEntries} />
          </div>
          
          {sortedAndFilteredEntries.length === 0 && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-700 text-sm">
              <p className="font-semibold">Aucune structure sur cette zone.</p>
            </div>
          )}
        </div>

        {/* Colonne INFO : Micro-besoins / Listing rapide */}
        <div className="space-y-6 flex flex-col">
          
          {/* Panneau Micros-Besoins */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-amber-100/50 px-4 py-3 border-b border-amber-200 flex items-center gap-2">
              <Megaphone size={16} className="text-amber-600" />
              <h3 className="font-bold text-amber-900 text-sm">Micros-Besoins Urgents</h3>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {MICRO_BESOINS.map(b => (
                 <div key={b.id} className="bg-white rounded-lg p-3 shadow-sm border border-amber-100">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 mb-1">{b.actor}</p>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{b.title}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={12}/> {b.urgency}</span>
                      <span className="flex items-center gap-1"><MapPin size={12}/> {b.location}</span>
                    </div>
                 </div>
              ))}
              <button className="w-full mt-2 py-2 text-xs font-bold text-amber-700 bg-amber-200/50 hover:bg-amber-200 rounded-lg transition-colors">
                Proposer son aide &rarr;
              </button>
            </div>
          </div>
          
          {/* Preview Liste rapide */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex-1 flex flex-col">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Sélection recommandée</h3>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pb-2" style={{ maxHeight: '250px'}}>
              {sortedAndFilteredEntries.slice(0, 4).map(entry => (
                <div key={`list-${entry.id}`} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">{entry.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">{entry.description}</p>
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{entry.kind}</span>
                    <span className="text-emerald-600 group-hover:underline">Voir &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
