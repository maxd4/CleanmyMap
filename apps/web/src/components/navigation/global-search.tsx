"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Command, CornerDownLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
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

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        toggle();
      }

      if (event.key === "Escape") {
        setIsOpen(false);
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
  }, [filteredItems, isOpen, router, selectedIndex, toggle]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="group inline-flex min-h-10 w-full items-center justify-between gap-2.5 rounded-full border border-white/10 bg-white/8 px-3.5 text-white/90 shadow-[0_18px_38px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl transition-all hover:border-cyan-200/24 hover:bg-white/12 hover:text-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
        title={locale === "fr" ? "Rechercher (Ctrl+K)" : "Search (Ctrl+K)"}
        aria-label={locale === "fr" ? "Rechercher" : "Search"}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4.5 w-4.5 shrink-0 text-cyan-100 transition-transform group-hover:scale-110" aria-hidden="true" />
          <span className="truncate cmm-text-caption font-black uppercase tracking-[0.14em]">
            {locale === "fr" ? "Rechercher" : "Search"}
          </span>
        </span>
        <kbd className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/18 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/56 sm:inline-flex">
          <Command size={10} />
          K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] sm:pt-[20vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/88"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center border-b border-slate-800 px-6 py-4">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder={locale === "fr" ? "Chercher une rubrique, un outil, une aide..." : "Search for a section, tool, help..."}
                  aria-label={locale === "fr" ? "Rechercher une rubrique, un outil ou une aide" : "Search for a section, tool or help"}
                  className="flex-1 bg-transparent px-4 py-2 text-lg text-slate-100 placeholder-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={locale === "fr" ? "Fermer la recherche" : "Close search"}
                  className="rounded-xl bg-slate-800 p-2 text-slate-400 transition-colors hover:text-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {query.trim() === "" ? (
                  <div className="py-12 text-center">
                    <p className="cmm-text-caption font-bold uppercase tracking-widest text-slate-500">
                      {locale === "fr" ? "Tapez un mot-clé pour explorer" : "Type a keyword to explore"}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {["Carte", "Impact", "Profil", "Admin", "Aide"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setQuery(tag)}
                          className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-400 transition-all hover:border-emerald-500/30 hover:text-emerald-300"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="space-y-1">
                    {filteredItems.map((item: SearchItem, index) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "group flex items-center justify-between rounded-2xl border border-transparent p-4 transition-all duration-200",
                          selectedIndex === index
                            ? "translate-x-1 border-slate-700/50 bg-slate-800/80 shadow-lg"
                            : "hover:bg-slate-800/40",
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all",
                              selectedIndex === index ? "scale-110 bg-slate-900 shadow-md" : "bg-slate-950",
                            )}
                          >
                            {item.spaceIcon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {item.spaceLabel}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-700" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">
                                Rubrique
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-100">
                              {item.label[locale]}
                            </h3>
                            <p className="line-clamp-1 text-xs text-slate-400">
                              {item.description[locale]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {selectedIndex === index ? (
                            <div className="flex items-center gap-1 rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              <CornerDownLeft size={10} /> ENTER
                            </div>
                          ) : null}
                          <ArrowRight
                            className={cn(
                              "h-5 w-5 transition-all",
                              selectedIndex === index
                                ? "translate-x-1 text-emerald-400 opacity-100"
                                : "text-slate-600 opacity-0",
                            )}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/50 text-slate-500">
                      <Search size={24} />
                    </div>
                    <p className="flex items-center justify-center gap-2 cmm-text-caption font-bold uppercase tracking-widest text-slate-500">
                      <span>🔍</span>
                      {locale === "fr" ? "Aucun résultat pour cette recherche" : "No results for this search"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {locale === "fr"
                        ? "Essayez un terme plus large, un nom de rubrique ou un mot-clé lié au contexte."
                        : "Try a broader term, a section name or a contextual keyword."}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-6 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                    <span className="rounded border border-slate-800 bg-slate-900 px-1 py-0.5">↑↓</span>
                    {locale === "fr" ? "Parcourir" : "Browse"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                    <span className="rounded border border-slate-800 bg-slate-900 px-1 py-0.5">ESC</span>
                    {locale === "fr" ? "Fermer" : "Close"}
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50">
                  Quick Search System
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
