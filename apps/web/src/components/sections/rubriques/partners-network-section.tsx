"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Handshake,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import {
  getEntryTrustState,
  isEditorialAnnuaireEntry,
} from "@/components/sections/rubriques/annuaire/annuaire-helpers";
import {
  buildPartnersNetworkEntriesModel,
  formatCount,
  getDomainLabel,
  getInitials,
  getKindLabel,
  getKindTone,
  getTerritoryLabel,
  getTrustLabel,
  getTrustTone,
  localize,
  type DomainFilter,
  type PartnerKindFilter,
  type TerritoryFilter,
} from "./partners-network-section.model";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { SPONSOR_PORTAL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { cn } from "@/lib/utils";

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

export function PartnersNetworkSection({ fr, showHeader = true }: { fr: boolean; showHeader?: boolean }) {
  const entries = INITIAL_ANNUAIRE_ENTRIES;
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<PartnerKindFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<TerritoryFilter>("all");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const { filteredEntries, visibleEntries } = useMemo(
    () =>
      buildPartnersNetworkEntriesModel({
        entries,
        query,
        kindFilter,
        domainFilter,
        territoryFilter: zoneFilter,
      }),
    [domainFilter, entries, kindFilter, query, zoneFilter],
  );
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 text-slate-950">
      {showHeader ? <section className="space-y-4">
            <PageHeader
              title={
                <span className="inline-flex items-center gap-3">
                  <Handshake className="h-6 w-6" aria-hidden="true" />
                  <span>{fr ? "Partenaires" : "Partners"}</span>
                </span>
              }
              subtitle={
                fr
                  ? "Consultez les fiches du référentiel partenaire."
                  : "Browse the partner directory records."
              }
            />
            <p className="max-w-3xl text-base leading-[1.7] text-slate-800">
              {fr
                ? "Recherchez une structure par type, domaine ou niveau territorial, puis ouvrez l’annuaire pour consulter l’ensemble de ses sources."
                : "Search by type, field or territorial level, then open the directory to consult its full set of sources."}
            </p>
          </section> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div
          ref={resultsRef}
          className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                {fr ? "Rechercher dans le référentiel" : "Search the directory"}
              </h2>
              <p className="mt-2 text-base leading-[1.7] text-slate-800">
                {fr
                  ? "Filtrez par type, territoire ou domaine d'action."
                  : "Filter by type, territory or field of action."}
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
              <label className="space-y-2 xl:col-span-5">
                <span className="cmm-text-small font-semibold text-slate-700">
                  {fr ? "Rechercher" : "Search"}
                </span>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-500"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={fr ? "Rechercher un partenaire..." : "Search a partner..."}
                    className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 pl-11 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="cmm-text-small font-semibold text-slate-700">
                  {fr ? "Type" : "Type"}
                </span>
                <select
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value as PartnerKindFilter)}
                  className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  <option value="all">{fr ? "Tous" : "All"}</option>
                  <option value="association">{fr ? "Associations" : "Associations"}</option>
                  <option value="collective">{fr ? "Collectivités" : "Collectivities"}</option>
                  <option value="company">{fr ? "Entreprises" : "Companies"}</option>
                  <option value="institution">{fr ? "Institutions" : "Institutions"}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="cmm-text-small font-semibold text-slate-700">
                  {fr ? "Domaine d'action" : "Field of action"}
                </span>
                <select
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value as DomainFilter)}
                  className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  <option value="all">{fr ? "Tous" : "All"}</option>
                  <option value="environnemental">{fr ? "Environnement" : "Environment"}</option>
                  <option value="social">{fr ? "Social" : "Social"}</option>
                  <option value="humanitaire">{fr ? "Humanitaire" : "Humanitarian"}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="cmm-text-small font-semibold text-slate-700">
                  {fr ? "Niveau territorial" : "Territorial level"}
                </span>
                <select
                  value={zoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value as TerritoryFilter)}
                  className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  <option value="all">{fr ? "Toutes" : "All"}</option>
                  <option value="france">{fr ? "France" : "National"}</option>
                  <option value="region">{fr ? "Région" : "Region"}</option>
                  <option value="departement">{fr ? "Département" : "Department"}</option>
                  <option value="ville">{fr ? "Ville" : "City"}</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="cmm-text-small font-semibold text-transparent" aria-hidden="true">
                  {fr ? "Action" : "Action"}
                </span>
                <CmmButton
                  type="button"
                  tone="primary"
                  variant="pill"
                  onClick={handleSearch}
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
                >
                  {fr ? "Rechercher" : "Search"}
                  <ArrowRight size={16} />
                </CmmButton>
              </div>
            </div>

            <div className="space-y-1 rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {fr
                  ? `${formatCount(filteredEntries.length)} fiches correspondent aux filtres`
                  : `${formatCount(filteredEntries.length)} records match the filters`}
              </p>
              <p className="text-sm leading-relaxed text-slate-800">
                {fr
                  ? "Source : registre éditorial de cet onglet. Il ne constitue pas une liste exhaustive et n'indique pas une activité récente."
                  : "Source: this tab's editorial register. It is not exhaustive and does not indicate recent activity."}
              </p>
              {filteredEntries.length > visibleEntries.length ? (
                <p className="text-sm text-slate-600">
                  {fr
                    ? `${formatCount(visibleEntries.length)} premières fiches affichées ici.`
                    : `First ${formatCount(visibleEntries.length)} records are shown here.`}
                </p>
              ) : null}
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
                      className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm"
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
                                "inline-flex rounded-full border px-2.5 py-1 cmm-text-caption font-semibold",
                                kindTone,
                              )}
                            >
                              {kindLabel}
                            </span>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 cmm-text-caption font-semibold",
                                trustTone,
                              )}
                            >
                              {trustLabel}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-black leading-tight text-slate-950">
                            {entry.name}
                          </h3>
                          <p className="mt-1 cmm-text-small font-medium text-slate-500">
                            {getDomainLabel(entry, fr ? "fr" : "en")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <p className="text-base leading-[1.6] text-slate-800">
                          {entry.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <MapPin size={14} className="text-pink-600" />
                          <span>{getTerritoryLabel(entry)}</span>
                        </div>

                        {!isEditorialAnnuaireEntry(entry) && entry.availability ? (
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-2 cmm-text-small font-medium text-slate-600">
                            {entry.availability}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <CmmButton
                          href="/sections/annuaire"
                          tone="secondary"
                          variant="pill"
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-4 cmm-text-small font-semibold text-pink-800 shadow-none"
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
                <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 px-5 py-10 text-center">
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
                    className="h-11 rounded-2xl border border-pink-200 bg-white px-5 cmm-text-small font-semibold text-pink-800"
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
                className="h-12 rounded-full border border-pink-200 bg-white px-8 cmm-text-small font-semibold text-pink-800"
              >
                {fr ? "Voir tous les partenaires" : "See all partners"}
                <ArrowRight size={16} />
              </CmmButton>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <aside className="rounded-3xl border border-pink-100 bg-pink-50/70 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">
              {fr ? "Types de partenaires" : "Partner types"}
            </h2>
            <div className="mt-6 space-y-4">
              {PARTNER_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title.fr} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-pink-200 bg-white text-pink-700">
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-950">{localize(fr ? "fr" : "en", item.title)}</p>
                      <p className="cmm-text-small leading-relaxed text-slate-800">
                        {localize(fr ? "fr" : "en", item.description)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <aside className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">
              {fr ? "Pourquoi devenir partenaire ?" : "Why become a partner?"}
            </h2>

            <div className="mt-5 space-y-3">
              {WHY_PARTNER.map((item) => (
                <div key={item.fr} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="text-base leading-relaxed text-slate-800">
                    {localize(fr ? "fr" : "en", item)}
                  </p>
                </div>
              ))}
            </div>

            <CmmButton
              href="/partners/onboarding"
              tone="primary"
              variant="pill"
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
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
                className="inline-flex items-center gap-2 cmm-text-small font-semibold text-pink-800 hover:text-pink-900"
              >
                {fr ? "Découvrir le programme" : "Discover the program"}
                <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-3xl border border-pink-200 bg-pink-50/70 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-700">
              <Handshake size={22} aria-hidden="true" />
            </div>
            <div className="max-w-2xl space-y-2">
              <h2 className="text-lg font-black leading-tight text-slate-950">
                {fr ? "Vous représentez une structure engagée ?" : "Do you represent an engaged organization?"}
              </h2>
              <p className="text-base leading-[1.7] text-slate-800">
                {fr
                  ? "Consultez l'annuaire, puis utilisez le parcours partenaire si vous souhaitez proposer une fiche."
                  : "Browse the directory, then use the partner path if you want to submit a record."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <CmmButton
              href={`mailto:${contactEmail}`}
              tone="secondary"
              variant="pill"
              className="h-11 rounded-full border border-pink-200 bg-white px-5 cmm-text-small font-semibold text-pink-800 shadow-none"
            >
              {fr ? "Nous contacter" : "Contact us"}
              <ArrowRight size={16} />
            </CmmButton>

            <CmmButton
              href="/partners/onboarding"
              tone="primary"
              variant="pill"
              className="h-11 rounded-full bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
            >
              {fr ? "Devenir partenaire" : "Become a partner"}
            </CmmButton>
          </div>
        </div>
      </section>
    </div>
  );
}
