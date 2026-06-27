"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { getEntryTrustState } from "@/components/sections/rubriques/annuaire-helpers";
import { CmmButton } from "@/components/ui/cmm-button";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { SPONSOR_PORTAL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";
type PartnerKindFilter = "all" | "association" | "collective" | "company" | "institution";
type DomainFilter = "all" | "environnemental" | "social" | "humanitaire";
type TerritoryFilter = "all" | "france" | "region" | "departement" | "ville";
type CollaborationTone = "violet" | "indigo" | "sky" | "rose" | "amber";

type CollaborationCard = {
  tone: CollaborationTone;
  badge: string;
  title: string;
  partner: string;
  period: string;
  summary: string;
  metric: string;
};

const HERO_METRICS = [
  {
    label: { fr: "Partenaires actifs", en: "Active partners" },
    value: "38",
    detail: { fr: "Actifs sur les 6 derniers mois", en: "Active in the last 6 months" },
    icon: Users,
  },
  {
    label: { fr: "Actions coordonnées", en: "Coordinated actions" },
    value: "126",
    detail: { fr: "Opérations menées ensemble", en: "Operations run together" },
    icon: Target,
  },
  {
    label: { fr: "Impact multiple", en: "Impact multiple" },
    value: "2,4x",
    detail: { fr: "Gain d'impact collectif estimé", en: "Estimated collective impact gain" },
    icon: Sparkles,
  },
] as const;

const PARTNER_TYPES = [
  {
    icon: Users,
    title: { fr: "Associations", en: "Associations" },
    description: {
      fr: "Agissent sur le terrain et mobilisent les citoyens.",
      en: "Act on the ground and mobilize citizens.",
    },
  },
  {
    icon: Landmark,
    title: { fr: "Collectivités", en: "Collectivities" },
    description: {
      fr: "Pilotent des territoires et facilitent les actions locales.",
      en: "Steer territories and support local actions.",
    },
  },
  {
    icon: Building2,
    title: { fr: "Entreprises", en: "Companies" },
    description: {
      fr: "Apportent des ressources, des outils et leur expertise.",
      en: "Bring resources, tools and expertise.",
    },
  },
  {
    icon: ShieldCheck,
    title: { fr: "Institutions", en: "Institutions" },
    description: {
      fr: "Fournissent des données, des cadres et des références.",
      en: "Provide data, frameworks and references.",
    },
  },
] as const;

const WHY_PARTNER = [
  {
    fr: "Valoriser vos actions et votre impact",
    en: "Showcase your actions and impact",
  },
  {
    fr: "Accéder à des données et outils fiables",
    en: "Access reliable data and tools",
  },
  {
    fr: "Collaborer sur des projets concrets",
    en: "Collaborate on concrete projects",
  },
  {
    fr: "Renforcer la transparence et la crédibilité",
    en: "Strengthen transparency and credibility",
  },
  {
    fr: "Rejoindre un réseau engagé et utile",
    en: "Join an engaged, useful network",
  },
] as const;

const COLLABORATIONS: CollaborationCard[] = [
  {
    tone: "violet",
    badge: "Nettoyage côtier",
    title: "Clean Coast Challenge",
    partner: "Surfrider Paris",
    period: "Mai - Juin 2024",
    summary: "Mobilisation citoyenne pour nettoyer 10 plages sur la côte Atlantique.",
    metric: "320 participants",
  },
  {
    tone: "sky",
    badge: "Cartographie",
    title: "Cartographie des dépôts",
    partner: "Paris.fr - Nettoyages participatifs",
    period: "Fév. - Avr. 2024",
    summary: "Cartographie collaborative des dépôts sauvages sur le territoire.",
    metric: "128 signalements",
  },
  {
    tone: "rose",
    badge: "Sensibilisation",
    title: "Écoles zéro déchet",
    partner: "Zero Waste Paris",
    period: "Mars - Juin 2024",
    summary: "Ateliers et fresques pour sensibiliser les jeunes à la pollution plastique.",
    metric: "15 établissements",
  },
  {
    tone: "amber",
    badge: "Valorisation",
    title: "Recyclage & réemploi",
    partner: "La REcyclerie - Ateliers",
    period: "Janv. - Déc. 2024",
    summary: "Optimiser la valorisation des déchets collectés sur le territoire partenaire.",
    metric: "2,1 t valorisées",
  },
  {
    tone: "indigo",
    badge: "Recherche & données",
    title: "Référentiel commun",
    partner: "JeVeuxAider",
    period: "En continu",
    summary: "Harmonisation des indicateurs et méthodes de calcul d'impact.",
    metric: "Référentiel partagé",
  },
];

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

function localize(locale: Locale, value: { fr: string; en: string }): string {
  return value[locale];
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isInstitution(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number]): boolean {
  const text = normalizeText([entry.name, entry.legalIdentity, entry.description].join(" "));
  return /mairie|ville de paris|ademe|gouv|universite|universite|minister|institution/.test(text);
}

function getKindLabel(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number], fr: boolean): string {
  if (isInstitution(entry)) {
    return fr ? "Institution" : "Institution";
  }

  switch (entry.kind) {
    case "association":
      return fr ? "Association" : "Association";
    case "groupe_parole":
    case "evenement":
      return fr ? "Collectif" : "Collective";
    case "commerce":
      return fr ? "Entreprise" : "Company";
    case "entreprise":
      return fr ? "Entreprise" : "Company";
    default:
      return fr ? "Partenaire" : "Partner";
  }
}

function getTrustLabel(state: ReturnType<typeof getEntryTrustState>, fr: boolean): string {
  switch (state) {
    case "trusted":
      return fr ? "Confirmée" : "Confirmed";
    case "pending":
      return fr ? "À confirmer" : "Pending";
    case "incomplete":
      return fr ? "À compléter" : "Incomplete";
    default:
      return fr ? "Partenaire" : "Partner";
  }
}

function getTrustTone(state: ReturnType<typeof getEntryTrustState>): string {
  switch (state) {
    case "trusted":
      return "border-emerald-200 bg-emerald-50 text-emerald-600";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-600";
    case "incomplete":
      return "border-rose-200 bg-rose-50 text-rose-600";
    default:
      return "border-violet-200 bg-violet-50 text-violet-600";
  }
}

function getKindTone(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number]): string {
  if (isInstitution(entry)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  switch (entry.kind) {
    case "association":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "groupe_parole":
    case "evenement":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "commerce":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "entreprise":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getTerritoryLabel(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number]): string {
  if (entry.scope === "national" || entry.scope === "france" || /france/i.test(entry.location)) {
    return "France entière";
  }

  if (entry.coveredArrondissements.length > 0) {
    return `${formatCount(entry.coveredArrondissements.length)} arrondissements`;
  }

  return entry.location;
}

function getDomainLabel(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number], locale: Locale): string {
  const labels = entry.types.map((type) => {
    switch (type) {
      case "environnemental":
        return locale === "fr" ? "Environnement" : "Environment";
      case "social":
        return locale === "fr" ? "Social" : "Social";
      case "humanitaire":
        return locale === "fr" ? "Humanitaire" : "Humanitarian";
      default:
        return type;
    }
  });

  return labels.join(" • ");
}

function matchesQuery(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number], query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const haystack = normalizeText(
    [
      entry.name,
      entry.description,
      entry.location,
      entry.legalIdentity,
      ...(entry.tags ?? []),
    ].join(" "),
  );

  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function matchesKind(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number], filter: PartnerKindFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "institution") {
    return isInstitution(entry);
  }

  if (filter === "company") {
    return entry.kind === "entreprise" || entry.kind === "commerce";
  }

  if (filter === "collective") {
    return entry.kind === "groupe_parole" || entry.kind === "evenement";
  }

  return entry.kind === "association";
}

function getTerritoryBucket(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number]): Exclude<TerritoryFilter, "all"> {
  const text = normalizeText(
    [
      entry.name,
      entry.description,
      entry.location,
      entry.legalIdentity,
      ...(entry.tags ?? []),
    ].join(" "),
  );

  if (entry.scope === "national" || entry.scope === "france" || text.includes("france") || text.includes("national")) {
    return "france";
  }

  if (text.includes("region") || text.includes("regional") || text.includes("ile de france")) {
    return "region";
  }

  if (
    entry.coveredArrondissements.length > 0
    || /\b\d{1,2}e\b/.test(text)
    || text.includes("arrondissement")
    || text.includes("departement")
  ) {
    return "departement";
  }

  return "ville";
}

function matchesTerritory(entry: (typeof INITIAL_ANNUAIRE_ENTRIES)[number], filter: TerritoryFilter): boolean {
  if (filter === "all") {
    return true;
  }

  return getTerritoryBucket(entry) === filter;
}

export function PartnersNetworkSection({ fr }: { fr: boolean }) {
  const entries = INITIAL_ANNUAIRE_ENTRIES;
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<PartnerKindFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<TerritoryFilter>("all");
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const collaborationsRef = useRef<HTMLDivElement | null>(null);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((left, right) => {
        const rightPriority = (right.isFeatured ? 3 : 0) + (getEntryTrustState(right) === "trusted" ? 2 : 0);
        const leftPriority = (left.isFeatured ? 3 : 0) + (getEntryTrustState(left) === "trusted" ? 2 : 0);
        return rightPriority - leftPriority || left.name.localeCompare(right.name, "fr");
      }),
    [entries],
  );

  const filteredEntries = useMemo(
    () =>
      sortedEntries.filter((entry) => {
        if (!matchesQuery(entry, query)) {
          return false;
        }

        if (!matchesKind(entry, kindFilter)) {
          return false;
        }

        if (domainFilter !== "all" && !entry.types.includes(domainFilter)) {
          return false;
        }

        if (!matchesTerritory(entry, zoneFilter)) {
          return false;
        }

        return true;
      }),
    [domainFilter, kindFilter, query, sortedEntries, zoneFilter],
  );

  const visibleEntries = filteredEntries.slice(0, 6);
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollCollaborations = (direction: number) => {
    collaborationsRef.current?.scrollBy({ left: direction, behavior: "smooth" });
  };

  return (
    <div className="space-y-8 text-slate-950">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-violet-500 shadow-sm">
            <Handshake className="h-4 w-4" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              {fr ? "Réseau & collaboration" : "Network & collaboration"}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-[clamp(2.6rem,5vw,4.8rem)] font-black leading-[0.9] tracking-[-0.05em] text-slate-950">
              {fr ? "Partenaires" : "Partners"}
            </h1>
            <p className="max-w-2xl text-[1.02rem] leading-[1.7] text-slate-600">
              {fr
                ? "Un réseau solide pour décupler notre impact."
                : "A solid network to multiply our impact."}
            </p>
            <p className="max-w-3xl text-[1.02rem] leading-[1.75] text-slate-600">
              {fr
                ? "Découvrez les organisations, entreprises et institutions qui agissent à nos côtés pour des territoires plus propres et des données fiables."
                : "Discover the organizations, companies and institutions working with us for cleaner territories and reliable data."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {HERO_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label.fr}
                className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-[0_20px_54px_-40px_rgba(79,70,229,0.34)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-600">
                  <Icon size={18} />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {localize(fr ? "fr" : "en", metric.label)}
                </p>
                <p className="mt-2 text-[clamp(1.9rem,2.5vw,2.5rem)] font-black leading-none tracking-[-0.04em] text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-slate-500">
                  {localize(fr ? "fr" : "en", metric.detail)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div
          ref={resultsRef}
          className="rounded-[2rem] border border-violet-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,247,255,0.98)_100%)] p-5 shadow-[0_24px_70px_-56px_rgba(79,70,229,0.36)] sm:p-6"
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-[0.92rem] font-black uppercase tracking-[0.18em] text-violet-600">
                {fr ? "Trouver le bon partenaire" : "Find the right partner"}
              </h2>
              <p className="mt-2 text-[0.96rem] leading-[1.7] text-slate-600">
                {fr
                  ? "Filtrez par type, territoire ou domaine d'action."
                  : "Filter by type, territory or field of action."}
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
              <label className="space-y-2 xl:col-span-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Rechercher" : "Search"}
                </span>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-400"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={fr ? "Rechercher un partenaire..." : "Search a partner..."}
                    className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 pl-11 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Type" : "Type"}
                </span>
                <select
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value as PartnerKindFilter)}
                  className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">{fr ? "Tous" : "All"}</option>
                  <option value="association">{fr ? "Associations" : "Associations"}</option>
                  <option value="collective">{fr ? "Collectivités" : "Collectivities"}</option>
                  <option value="company">{fr ? "Entreprises" : "Companies"}</option>
                  <option value="institution">{fr ? "Institutions" : "Institutions"}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Domaine d'action" : "Field of action"}
                </span>
                <select
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value as DomainFilter)}
                  className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">{fr ? "Tous" : "All"}</option>
                  <option value="environnemental">{fr ? "Environnement" : "Environment"}</option>
                  <option value="social">{fr ? "Social" : "Social"}</option>
                  <option value="humanitaire">{fr ? "Humanitaire" : "Humanitarian"}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Niveau territorial" : "Territorial level"}
                </span>
                <select
                  value={zoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value as TerritoryFilter)}
                  className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">{fr ? "Toutes" : "All"}</option>
                  <option value="france">{fr ? "France" : "National"}</option>
                  <option value="region">{fr ? "Région" : "Region"}</option>
                  <option value="departement">{fr ? "Département" : "Department"}</option>
                  <option value="ville">{fr ? "Ville" : "City"}</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-transparent">
                  {fr ? "Action" : "Action"}
                </span>
                <CmmButton
                  type="button"
                  tone="primary"
                  variant="pill"
                  onClick={handleSearch}
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-5 text-[0.72rem] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_42px_-22px_rgba(79,70,229,0.55)]"
                >
                  {fr ? "Rechercher" : "Search"}
                  <ArrowRight size={16} />
                </CmmButton>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-violet-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-600">
                {fr
                  ? `${formatCount(filteredEntries.length)} partenaires affichés`
                  : `${formatCount(filteredEntries.length)} partners displayed`}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
                <CheckCircle2 size={14} />
                {fr ? "Mise à jour" : "Updated"}
              </div>
            </div>

            {visibleEntries.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleEntries.map((entry) => {
                  const trustState = getEntryTrustState(entry);
                  const kindLabel = getKindLabel(entry, fr);
                  const trustLabel = getTrustLabel(trustState, fr);
                  const trustTone = getTrustTone(trustState);
                  const kindTone = getKindTone(entry);

                  return (
                    <article
                      key={entry.id}
                      className="rounded-[1.6rem] border border-violet-200 bg-white p-4 shadow-[0_16px_42px_-34px_rgba(79,70,229,0.36)]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                            kindTone,
                          )}
                        >
                          {getInitials(entry.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                                kindTone,
                              )}
                            >
                              {kindLabel}
                            </span>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                                trustTone,
                              )}
                            >
                              {trustLabel}
                            </span>
                          </div>
                          <h3 className="mt-2 truncate text-[1.02rem] font-black leading-tight text-slate-950">
                            {entry.name}
                          </h3>
                          <p className="mt-1 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-slate-500">
                            {getDomainLabel(entry, fr ? "fr" : "en")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <p className="text-[0.95rem] leading-[1.6] text-slate-600">
                          {entry.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <MapPin size={14} className="text-violet-500" />
                          <span>{getTerritoryLabel(entry)}</span>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-[0.78rem] font-medium text-slate-600">
                          {entry.availability}
                        </div>
                      </div>

                      <div className="mt-4">
                        <CmmButton
                          href="/sections/annuaire"
                          tone="secondary"
                          variant="pill"
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-[0.7rem] font-black uppercase tracking-[0.18em] text-violet-700 shadow-none"
                        >
                          {fr ? "Voir le profil" : "View profile"}
                          <ArrowRight size={16} />
                        </CmmButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-violet-200 bg-white px-5 py-10 text-center">
                <p className="text-lg font-black text-slate-950">
                  {fr ? "Aucun partenaire ne correspond aux filtres." : "No partner matches the filters."}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {fr
                    ? "Réinitialisez la recherche pour retrouver le réseau complet."
                    : "Reset the filters to see the full network again."}
                </p>
                <div className="mt-5 flex justify-center">
                  <CmmButton
                    type="button"
                    tone="secondary"
                    variant="pill"
                    onClick={() => {
                      setQuery("");
                      setKindFilter("all");
                      setDomainFilter("all");
                      setZoneFilter("all");
                    }}
                    className="h-11 rounded-2xl border border-violet-200 bg-white px-5 text-[0.72rem] font-black uppercase tracking-[0.16em] text-violet-700"
                  >
                    {fr ? "Réinitialiser" : "Reset filters"}
                  </CmmButton>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <CmmButton
                href="/sections/annuaire"
                tone="secondary"
                variant="pill"
                className="h-12 rounded-full border border-violet-200 bg-white px-8 text-[0.72rem] font-black uppercase tracking-[0.16em] text-violet-700"
              >
                {fr ? "Voir tous les partenaires" : "See all partners"}
                <ArrowRight size={16} />
              </CmmButton>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <aside className="rounded-[2rem] border border-violet-200 bg-[linear-gradient(180deg,#29245f_0%,#1c173f_100%)] p-6 text-white shadow-[0_24px_72px_-50px_rgba(37,34,110,0.55)]">
            <h2 className="text-[0.92rem] font-black uppercase tracking-[0.2em] text-white/80">
              {fr ? "Types de partenaires" : "Partner types"}
            </h2>
            <div className="mt-6 space-y-4">
              {PARTNER_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title.fr} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/90">
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-white">{localize(fr ? "fr" : "en", item.title)}</p>
                      <p className="text-[0.86rem] leading-relaxed text-white/70">
                        {localize(fr ? "fr" : "en", item.description)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <aside className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-[0_24px_72px_-54px_rgba(79,70,229,0.24)]">
            <h2 className="text-[0.92rem] font-black uppercase tracking-[0.18em] text-violet-700">
              {fr ? "Pourquoi devenir partenaire ?" : "Why become a partner?"}
            </h2>

            <div className="mt-5 space-y-3">
              {WHY_PARTNER.map((item) => (
                <div key={item.fr} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="text-[0.95rem] leading-relaxed text-slate-700">
                    {localize(fr ? "fr" : "en", item)}
                  </p>
                </div>
              ))}
            </div>

            <CmmButton
              href="/partners/onboarding"
              tone="primary"
              variant="pill"
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-5 text-[0.72rem] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_42px_-22px_rgba(79,70,229,0.55)]"
            >
              {fr ? "Devenir partenaire" : "Become a partner"}
              <ArrowRight size={16} />
            </CmmButton>

            <div className="mt-4 space-y-1 text-sm leading-relaxed text-slate-600">
              <p>
                {fr
                  ? "En savoir plus sur notre programme partenaire."
                  : "Learn more about our partner program."}
              </p>
              <Link
                href={SPONSOR_PORTAL_ROUTE}
                className="inline-flex items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.16em] text-violet-700 hover:text-violet-800"
              >
                {fr ? "Découvrir le programme" : "Discover the program"}
                <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_24px_72px_-54px_rgba(79,70,229,0.24)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-[0.92rem] font-black uppercase tracking-[0.18em] text-violet-700">
              {fr ? "Collaborations en cours" : "Current collaborations"}
            </h2>
            <p className="text-[0.96rem] leading-[1.7] text-slate-600">
              {fr
                ? "Projets et initiatives menées avec nos partenaires."
                : "Projects and initiatives carried out with our partners."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCollaborations(-360)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
              aria-label={fr ? "Faire défiler vers la gauche" : "Scroll left"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollCollaborations(360)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
              aria-label={fr ? "Faire défiler vers la droite" : "Scroll right"}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={collaborationsRef}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {COLLABORATIONS.map((item) => (
            <article
              key={item.title}
              className="min-w-[240px] flex-1 snap-start rounded-[1.6rem] border border-violet-200 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(79,70,229,0.32)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                    {
                      violet: "border-violet-200 bg-violet-50 text-violet-700",
                      indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
                      sky: "border-sky-200 bg-sky-50 text-sky-700",
                      rose: "border-rose-200 bg-rose-50 text-rose-700",
                      amber: "border-amber-200 bg-amber-50 text-amber-700",
                    }[item.tone],
                  )}
                >
                  {item.badge}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <Sparkles size={16} />
                </div>
              </div>

              <h3 className="mt-4 text-[1rem] font-black leading-tight text-slate-950">
                {item.title}
              </h3>
              <div className="mt-2 space-y-1 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-violet-500" />
                  <span>{item.partner}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-violet-500" />
                  <span>{item.period}</span>
                </div>
              </div>

              <p className="mt-4 text-[0.92rem] leading-[1.65] text-slate-600">
                {item.summary}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[0.78rem] font-semibold text-violet-700">
                  {item.metric}
                </span>
                <ArrowRight className="h-4 w-4 text-violet-400" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2.4rem] bg-[linear-gradient(135deg,#2e256f_0%,#221c54_48%,#2a2270_100%)] p-6 text-white shadow-[0_30px_100px_-54px_rgba(44,39,120,0.8)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/95 text-violet-600 shadow-2xl">
              <Handshake size={34} />
            </div>
            <div className="max-w-2xl space-y-2">
              <h2 className="text-[1.2rem] font-black leading-tight tracking-[-0.03em] sm:text-[1.35rem]">
                {fr ? "Vous représentez une structure engagée ?" : "Do you represent an engaged organization?"}
              </h2>
              <p className="max-w-xl text-[0.96rem] leading-[1.7] text-white/90">
                {fr
                  ? "Rejoignez CleanMyMap et construisons ensemble des territoires plus propres, des données plus fiables et un impact réel."
                  : "Join CleanMyMap and build cleaner territories, more reliable data and real impact together."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <CmmButton
              href={`mailto:${contactEmail}`}
              tone="secondary"
              variant="pill"
              className="h-14 rounded-full bg-white px-6 text-[0.72rem] font-black uppercase tracking-[0.18em] text-violet-700 shadow-2xl"
            >
              {fr ? "Nous contacter" : "Contact us"}
              <ArrowRight size={16} />
            </CmmButton>

            <CmmButton
              href="/partners/onboarding"
              tone="primary"
              variant="pill"
              className="h-14 rounded-full border border-white/10 bg-violet-500 px-6 text-[0.72rem] font-black uppercase tracking-[0.18em] text-white shadow-2xl"
            >
              {fr ? "Devenir partenaire" : "Become a partner"}
            </CmmButton>
          </div>
        </div>
      </section>
    </div>
  );
}
