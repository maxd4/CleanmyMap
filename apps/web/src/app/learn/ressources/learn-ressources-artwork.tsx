"use client";

import Image from "next/image";
import { ChevronDown, Palette } from "lucide-react";

import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import { ARTWORK_REFERENCES } from "./learn-ressources-client.data";
import { useDisclosureState } from "./learn-ressources-client.state";

export function LearnArtworkAccordion({
  locale,
  defaultOpen = false,
}: {
  locale: LearnLocale;
  defaultOpen?: boolean;
}) {
  const { isOpen, handleToggle } = useDisclosureState(defaultOpen);

  return (
    <details
      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Culture visuelle" : "Visual culture"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Références artistiques à ouvrir si besoin" : "Art references to open when needed"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {ARTWORK_REFERENCES.length}
          </span>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Palette className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </summary>

      <div className="mt-5">
        {isOpen ? (
          <div className="space-y-4">
            {ARTWORK_REFERENCES.map((artwork, index) => (
              <details
                key={artwork.key}
                className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 shadow-sm"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none transition hover:bg-slate-100/70 focus-visible:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14 md:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                      {artwork.title[locale]}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {artwork.artist[locale]} · {artwork.material[locale]}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition duration-150 group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>

                <div className="border-t border-slate-200 px-4 pb-4 pt-4 md:px-5 md:pb-5">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <figure className="relative h-64 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50 md:h-[22rem]">
                      <Image
                        src={artwork.image.src}
                        alt={artwork.image.alt[locale]}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                      <figcaption className="border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                        {artwork.image.caption[locale]}{" "}
                        <a
                          href={artwork.source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-amber-700 transition hover:text-amber-800 hover:underline"
                        >
                          {artwork.source.label[locale]}
                        </a>
                      </figcaption>
                    </figure>

                    <div className="space-y-3">
                      {artwork.context.map((paragraph) => (
                        <p key={paragraph[locale]} className="text-sm leading-relaxed text-slate-700">
                          {paragraph[locale]}
                        </p>
                      ))}

                      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {locale === "fr" ? "Intérêt pour CleanMyMap" : "Why it matters for CleanMyMap"}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{artwork.interest[locale]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        )}
      </div>
    </details>
  );
}
