"use client";

import Image from "next/image";
import { ChevronDown, ExternalLink, Palette } from "lucide-react";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { ARTWORK_REFERENCES } from "./learn-ressources-client.data";
import { useDisclosureState } from "./learn-ressources-client.state";

export function LearnArtworkAccordion({ locale, defaultOpen = false }: { locale: LearnLocale; defaultOpen?: boolean }) {
  const { isOpen, handleToggle } = useDisclosureState(defaultOpen);
  const fr = locale === "fr";
  return (
    <details className="group rounded-2xl border border-amber-200 bg-white p-4 dark:bg-slate-900 md:p-5" open={isOpen} onToggle={handleToggle}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-900"><Palette className="h-5 w-5" aria-hidden="true" /></span><div><p className="cmm-text-caption font-bold">{fr ? "Culture visuelle" : "Visual culture"}</p><h3 className="text-xl font-bold cmm-text-primary">{fr ? (defaultOpen ? "Références artistiques" : "Références artistiques à ouvrir si besoin") : "Art references"}</h3><p className="cmm-text-small">{fr && !defaultOpen ? "Les fiches restent fermées au départ. " : ""}{ARTWORK_REFERENCES.length} {fr ? "fiches à découvrir" : "cards to discover"}</p></div></div>
        <ChevronDown className="h-5 w-5 shrink-0 text-amber-800 group-open:rotate-180" aria-hidden="true" />
      </summary>
      {isOpen && <div className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ARTWORK_REFERENCES.map((artwork) => (
          <article key={artwork.key} className="min-w-0 overflow-hidden rounded-xl border border-amber-200 bg-white dark:bg-slate-900">
            <figure><div className="relative aspect-[4/3] overflow-hidden bg-amber-50 dark:bg-slate-800"><Image src={artwork.image.src} alt={artwork.image.alt[locale]} fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-contain" /></div><figcaption className="px-3 pt-2 cmm-text-small">{artwork.image.caption[locale]}</figcaption></figure>
            <div className="space-y-3 p-4"><h4 className="text-lg font-bold cmm-text-primary">{artwork.title[locale]}</h4><p className="cmm-text-small">{artwork.artist[locale]} · {artwork.material[locale]}</p>
              <details className="group/artwork rounded-lg border border-amber-200 p-3"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 font-semibold cmm-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70">{fr ? "Contexte et démarche" : "Context and approach"}<ChevronDown className="h-4 w-4 shrink-0 group-open/artwork:rotate-180" aria-hidden="true" /></summary><div className="space-y-3 border-t border-amber-100 pt-3">{artwork.context.map((paragraph) => <p key={paragraph[locale]} className="cmm-text-body">{paragraph[locale]}</p>)}<div className="rounded-lg bg-amber-50 p-3 text-slate-900 dark:bg-amber-950 dark:text-white"><p className="text-sm font-bold">{fr ? "Lecture pédagogique" : "Educational interpretation"}</p><p className="mt-1 text-sm">{artwork.interest[locale]}</p></div></div></details>
              <a href={artwork.source.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-amber-900 underline dark:text-amber-200">{artwork.source.label[locale]}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
            </div>
          </article>
        ))}
      </div>}
    </details>
  );
}
