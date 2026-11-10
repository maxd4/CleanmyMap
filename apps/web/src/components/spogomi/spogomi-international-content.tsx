"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Globe2,
  Megaphone,
  SlidersHorizontal,
} from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmIcon } from "@/components/ui/cmm-icon";
import {
  filterSpogomiExternalEvents,
  type SpogomiExternalEvent,
  type SpogomiInternationalNews,
  type SpogomiInternationalSource,
} from "@/lib/spogomi/international-content";
import { formatCivilDateInLocale } from "@/lib/time/civil-date";
import type { Locale } from "@/lib/ui/preferences";

export type SpogomiInternationalContentProps = {
  locale: Locale;
  sources: SpogomiInternationalSource[];
  news: SpogomiInternationalNews[];
  externalEvents: SpogomiExternalEvent[];
  visibleSections?: readonly ("world" | "news" | "events")[];
  copy: {
    worldTitle: string;
    worldDescription: string;
    cleanMyMapRole: string;
    worldDetails: string;
    officialSources: string;
    verifiedOn: string;
    newsTitle: string;
    confirmed: string;
    planned: string;
    dateSet: string;
    internationalEvents: string;
    year: string;
    country: string;
    allYears: string;
    allCountries: string;
    externalEvent: string;
    source: string;
    noExternalEvents: string;
  };
};

function stateLabel(
  state: SpogomiExternalEvent["state"] | SpogomiInternationalNews["state"],
  copy: SpogomiInternationalContentProps["copy"],
) {
  if (state === "planned") return copy.planned;
  if (state === "date_set") return copy.dateSet;
  return copy.confirmed;
}

function formatDate(value: string, locale: Locale) {
  return formatCivilDateInLocale(value, locale === "fr" ? "fr-FR" : "en-US");
}

export function SpogomiInternationalContent({
  locale,
  sources,
  news,
  externalEvents,
  visibleSections = ["world", "news", "events"],
  copy,
}: SpogomiInternationalContentProps) {
  const [year, setYear] = useState<number | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const years = useMemo(
    () =>
      [...new Set(externalEvents.map((event) => event.year))].sort(
        (left, right) => left - right,
      ),
    [externalEvents],
  );
  const countries = useMemo(
    () =>
      [...new Set(externalEvents.map((event) => event.country.fr))].sort(
        (left, right) => left.localeCompare(right, locale),
      ),
    [externalEvents, locale],
  );
  const filteredEvents = useMemo(
    () => filterSpogomiExternalEvents(externalEvents, { year, country }),
    [externalEvents, year, country],
  );
  const gridClassName =
    visibleSections.length === 1
      ? "grid items-start gap-4"
      : "grid items-start gap-4 lg:grid-cols-3";

  return (
    <section
      id="spogomi-international"
      className="space-y-4 scroll-mt-6"
      aria-label={copy.worldTitle}
    >
      <div className={gridClassName}>
        {visibleSections.includes("world") ? (
          <CmmCard
            tone="slate"
            variant="glass"
            className="min-w-0 space-y-4 p-4 sm:p-5"
            data-testid="spogomi-international-world"
          >
            <div className="flex items-start gap-3">
              <CmmIcon icon={Globe2} className="mt-1 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">
                  {copy.worldTitle}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-900">
                  {copy.worldDescription}
                </p>
              </div>
            </div>
            <CmmDisclosure summary={copy.worldDetails} tone="emerald" size="sm">
              <div className="space-y-4 text-sm leading-6 text-slate-900">
                <p>{copy.cleanMyMapRole}</p>
                <div data-testid="spogomi-international-sources">
                  <p className="font-black text-slate-950">{copy.officialSources}</p>
                  <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white/60 px-4">
                    {sources.map((source) => (
                      <li key={source.id} className="py-3 first:pt-4 last:pb-4">
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          {source.label[locale]}
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                        <p className="cmm-text-small mt-1 text-slate-800">
                          {source.description[locale]} · {copy.verifiedOn}{" "}
                          {source.verifiedAt}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CmmDisclosure>
          </CmmCard>
        ) : null}

        {visibleSections.includes("news") ? (
          <CmmCard
            tone="slate"
            variant="glass"
            className="min-w-0 space-y-4 p-4 sm:p-5"
            data-testid="spogomi-international-news"
          >
            <div className="flex items-start gap-3">
              <CmmIcon icon={Megaphone} className="mt-1 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">
                  {copy.newsTitle}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-900">
                  {copy.officialSources}
                </p>
              </div>
            </div>
            <div className="grid gap-3" data-testid="spogomi-international-news-list">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="space-y-3 rounded-2xl border border-emerald-100 bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="cmm-text-small rounded-full bg-emerald-50 px-2.5 py-1 font-bold uppercase tracking-[0.12em] text-emerald-900">
                      {stateLabel(item.state, copy)}
                    </span>
                    <time className="cmm-text-small text-slate-800" dateTime={item.publishedAt}>
                      {formatDate(item.publishedAt, locale)}
                    </time>
                  </div>
                  <h3 className="font-black text-slate-950">{item.title[locale]}</h3>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {item.sourceLabel}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          </CmmCard>
        ) : null}

        {visibleSections.includes("events") ? (
          <CmmCard
            tone="slate"
            variant="glass"
            className="min-w-0 space-y-4 p-4 sm:p-5"
            data-testid="spogomi-international-events"
          >
            <div className="flex items-start gap-3">
              <CmmIcon icon={SlidersHorizontal} className="mt-1 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">
                  {copy.internationalEvents}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-900">{copy.externalEvent}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" aria-label={`${copy.internationalEvents} filters`}>
              <label className="space-y-1 text-sm font-bold text-slate-900">
                <span>{copy.year}</span>
                <select
                  aria-label={copy.year}
                  value={year ?? ""}
                  onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="">{copy.allYears}</option>
                  {years.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-bold text-slate-900">
                <span>{copy.country}</span>
                <select
                  aria-label={copy.country}
                  value={country ?? ""}
                  onChange={(event) => setCountry(event.target.value || null)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="">{copy.allCountries}</option>
                  {countries.map((value) => (
                    <option key={value} value={value}>
                      {locale === "fr"
                        ? value
                        : externalEvents.find((event) => event.country.fr === value)?.country.en ?? value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {filteredEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-900">
                {copy.noExternalEvents}
              </p>
            ) : (
              <div className="grid gap-3" data-testid="spogomi-international-events-list">
                {filteredEvents.map((event) => (
                  <article
                    key={event.id}
                    className="space-y-3 rounded-2xl border border-emerald-100 bg-white/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-slate-950">{event.name[locale]}</h3>
                      <span className="cmm-text-small rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-900">
                        {stateLabel(event.state, copy)}
                      </span>
                    </div>
                    <p className="flex items-center gap-2 text-sm leading-6 text-slate-900">
                      <CalendarDays size={15} className="shrink-0 text-emerald-700" aria-hidden="true" />
                      {event.period[locale]} · {event.place[locale]}
                    </p>
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {copy.source}: {event.sourceLabel}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            )}
          </CmmCard>
        ) : null}
      </div>
    </section>
  );
}
