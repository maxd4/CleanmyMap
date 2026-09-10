"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import { getNavigationSpacesForProfile } from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";
import type { DisplayMode, Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type GlobalSearchProps = {
  currentProfile: AppProfile;
};

type SearchItem = ReturnType<typeof buildSearchItems>[number];

function buildSearchItems(
  currentProfile: AppProfile,
  displayMode: DisplayMode,
  locale: Locale,
) {
  const spaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
  return spaces.flatMap((space) =>
    space.items.map((item) => ({
      ...item,
      spaceLabel: space.label[locale],
      spaceIcon: space.icon,
    })),
  );
}

export function GlobalSearch({ currentProfile }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { locale, displayMode } = useSitePreferences();
  const router = useRouter();
  const pathname = usePathname();

  const allItems = useMemo(
    () => buildSearchItems(currentProfile, displayMode, locale),
    [currentProfile, displayMode, locale],
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(" ");
    return allItems
      .filter((item) => {
        const label = item.label[locale].toLowerCase();
        const description = item.description[locale].toLowerCase();
        const space = item.spaceLabel.toLowerCase();
        return searchTerms.every(
          (term) => label.includes(term) || description.includes(term) || space.includes(term),
        );
      })
      .slice(0, 8);
  }, [allItems, locale, query]);

  const suggestedItems = useMemo(() => allItems.slice(0, 5), [allItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
      }

      if (!isOpen) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (event.key === "Enter" && filteredItems[selectedIndex]) {
        event.preventDefault();
        router.push(filteredItems[selectedIndex].href);
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, isOpen, router, selectedIndex]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [pathname]);

  return (
    <CmmDropdown
      id="global-search-popover"
      ariaLabel={locale === "fr" ? "Recherche globale" : "Global search"}
      open={isOpen}
      onOpenChange={setIsOpen}
      panelRole="region"
      triggerHasPopup="dialog"
      panelClassName="w-[min(42rem,calc(100vw-1rem))]"
      wrapperClassName="w-full"
      verticalGap={8}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          className="group inline-flex min-h-10 w-full items-center justify-between gap-2.5 rounded-full border border-cyan-100/30 bg-slate-950/70 px-3.5 text-white shadow-[0_18px_38px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl transition-colors hover:border-cyan-100/50 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          aria-label={locale === "fr" ? "Rechercher" : "Search"}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="h-4.5 w-4.5 shrink-0 text-cyan-100" aria-hidden="true" />
            <span className="truncate cmm-text-caption font-black uppercase tracking-[0.14em]">
              {locale === "fr" ? "Rechercher" : "Search"}
            </span>
          </span>
          <kbd className="hidden shrink-0 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white/70 sm:inline-flex">
            Ctrl K / ⌘ K
          </kbd>
        </button>
      )}
    >
      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4">
          <Search className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder={locale === "fr" ? "Chercher une rubrique, un outil, une aide..." : "Search for a section, tool, help..."}
            aria-label={locale === "fr" ? "Rechercher une rubrique, un outil ou une aide" : "Search for a section, tool or help"}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-lg text-slate-100 placeholder-slate-500 outline-none sm:px-4"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={locale === "fr" ? "Fermer la recherche" : "Close search"}
            className="rounded-xl bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent sm:p-4">
          {query.trim() === "" ? (
            <div className="py-8 text-center sm:py-10">
              <p className="cmm-text-caption font-bold uppercase tracking-widest text-slate-400">
                {locale === "fr" ? "Explorez les rubriques accessibles" : "Explore the available sections"}
              </p>
              {suggestedItems.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuery(item.label[locale])}
                      className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-400/60 hover:bg-slate-800 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      {item.label[locale]}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {locale === "fr" ? "Aucune rubrique disponible pour ce profil." : "No section is available for this profile."}
                </p>
              )}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-1">
              {filteredItems.map((item: SearchItem, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    setQuery("");
                    setSelectedIndex(0);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group flex min-w-0 items-center justify-between gap-3 rounded-2xl border p-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:p-4",
                    selectedIndex === index
                      ? "border-emerald-400/45 bg-emerald-950/55 shadow-lg"
                      : "border-transparent hover:bg-slate-800/70",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-12 sm:w-12 sm:text-xl",
                        selectedIndex === index ? "bg-slate-900 shadow-md" : "bg-slate-950",
                      )}
                    >
                      {item.spaceIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">
                          Rubrique
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {item.spaceLabel}
                        </span>
                      </div>
                      <h3 className="truncate text-sm font-bold text-slate-100 sm:text-base">
                        {item.label[locale]}
                      </h3>
                      <p className="line-clamp-2 text-xs text-slate-400">
                        {item.description[locale]}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {selectedIndex === index ? (
                      <div className="hidden items-center gap-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 sm:flex">
                        <CornerDownLeft size={10} aria-hidden="true" /> Entrée
                      </div>
                    ) : null}
                    <ArrowRight
                      className={cn(
                        "h-5 w-5",
                        selectedIndex === index ? "text-emerald-300 opacity-100" : "text-slate-600 opacity-0",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center sm:py-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/70 text-slate-400">
                <Search size={24} aria-hidden="true" />
              </div>
              <p className="cmm-text-caption font-bold uppercase tracking-widest text-slate-300">
                {locale === "fr" ? "Aucun résultat pour cette recherche" : "No results for this search"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {locale === "fr"
                  ? "Essayez un terme plus large, un nom de rubrique ou un mot-clé lié au contexte."
                  : "Try a broader term, a section name or a contextual keyword."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800 bg-slate-950/40 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5">↑↓</span>
            {locale === "fr" ? "Parcourir" : "Browse"}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5">Entrée</span>
            {locale === "fr" ? "Ouvrir" : "Open"}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5">Échap</span>
            {locale === "fr" ? "Fermer" : "Close"}
          </div>
        </div>
      </div>
    </CmmDropdown>
  );
}
