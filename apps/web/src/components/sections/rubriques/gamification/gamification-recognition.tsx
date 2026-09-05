"use client";

import { BadgeCheck, Search, ShieldCheck, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyStateCard, SectionLabel } from "./gamification-shell";

export function RecognitionPanel({
  locale,
  scope,
  setScope,
  searchQuery,
  setSearchQuery,
}: {
  locale: string;
  scope: "individual" | "collective";
  setScope: (value: "individual" | "collective") => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const fr = locale === "fr";
  const scopeLabel =
    scope === "individual"
      ? fr
        ? "Comptes"
        : "Accounts"
      : fr
        ? "Structures"
        : "Organizations";
  const placeholder =
    scope === "individual"
      ? fr
        ? "Rechercher un compte (nom, structure)..."
        : "Search an account (name, organization)..."
      : fr
        ? "Rechercher une structure..."
        : "Search an organization...";
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Users}
        title={fr ? "Reconnaissance sociale" : "Social recognition"}
        subtitle={fr ? "Le classement met en lumière l'engagement au sein de la communauté." : "The ranking highlights engagement across the community."}
      />

      <div className="mt-5 flex w-fit rounded-full border border-[#f0d9d2] bg-[#fff7f5] p-1">
        <button
          type="button"
          onClick={() => setScope("individual")}
          className={cn(
            "rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors",
            scope === "individual"
              ? "bg-[#c51f1f] text-white shadow-[0_10px_24px_rgba(197,31,31,0.18)]"
              : "text-[#7c645d] hover:text-[#301815]",
          )}
        >
          {fr ? "Comptes" : "Accounts"}
        </button>
        <button
          type="button"
          onClick={() => setScope("collective")}
          className={cn(
            "rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors",
            scope === "collective"
              ? "bg-[#c51f1f] text-white shadow-[0_10px_24px_rgba(197,31,31,0.18)]"
              : "text-[#7c645d] hover:text-[#301815]",
          )}
        >
          {fr ? "Structures" : "Organizations"}
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#6f5a56]">
        {fr
          ? "Le classement met en lumière l'engagement au sein de la communauté."
          : "The ranking highlights engagement across the community."}
      </p>

      <div className="relative mt-5">
        <Search
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a58c86]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[1.35rem] border border-[#eadad4] bg-white py-3.5 pl-12 pr-12 text-sm text-[#281614] placeholder:text-[#a58c86] focus:border-[#dd5a52] focus:outline-none focus:ring-4 focus:ring-[#f7d4cf]"
        />
        {searchQuery.trim().length > 0 ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-[#eadad4] bg-[#fff7f5] p-1.5 text-[#af625a] transition hover:border-[#cf3b34] hover:text-[#bb362f]"
            aria-label={fr ? "Effacer la recherche" : "Clear search"}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex min-h-[22rem] items-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-5 py-10">
        <EmptyStateCard
          title={
            hasSearch
              ? fr
                ? "Aucune correspondance trouvée"
                : "No match found"
              : fr
                ? "Le moteur de classement n'est pas encore disponible"
                : "The ranking engine is not yet available"
          }
          description={
            hasSearch
              ? fr
                ? "Essayez un autre nom ou passez sur l'autre onglet pour comparer les structures."
                : "Try another name or switch tabs to compare organizations."
              : fr
                ? "La reconnaissance apparaîtra ici dès que des contributions validées seront enregistrées."
                : "Recognition will appear here as soon as validated contributions are recorded."
          }
          icon={hasSearch ? BadgeCheck : ShieldCheck}
          ctaLabel={scopeLabel}
        />
      </div>

      <div className="mt-5 rounded-[1.55rem] border border-[#efc7c1] bg-white px-4 py-4 text-center text-[13px] leading-6 text-[#9a625c]">
        {fr
          ? "Votre engagement compte. Continuez à contribuer : la reconnaissance suivra naturellement."
          : "Your engagement matters. Keep contributing: recognition will follow naturally."}
      </div>
    </section>
  );
}
