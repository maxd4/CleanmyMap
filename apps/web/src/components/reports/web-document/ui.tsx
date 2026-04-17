"use client";

import type { ChapterAudience } from "./types";
import { toFrNumber } from "./analytics";
import type { MonthRow } from "./types";

export function ReportPage(props: {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  audience: ChapterAudience;
  children: React.ReactNode;
}) {
  const audienceBadge =
    props.audience === "terrain"
      ? "Usage terrain"
      : props.audience === "strategie"
        ? "Usage decideur"
        : "Usage terrain + decideur";

  return (
    <section
      id={props.id}
      className="scroll-mt-28 break-after-page rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)] last:break-after-auto"
    >
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0f4c5c] via-[#1f5d7f] to-[#24426f] p-[1cm] text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {props.kicker}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold leading-tight">{props.title}</h2>
          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
            {audienceBadge}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-100/90">{props.subtitle}</p>
      </div>
      <div className="space-y-5 p-[1cm]">{props.children}</div>
    </section>
  );
}

export function MetricCard(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: "base" | "accent" | "danger";
}) {
  const toneClass =
    props.tone === "accent"
      ? "border-[#3f7f95] bg-[#edf7fa]"
      : props.tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-[#f8fafc]";

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</p>
      {props.hint ? <p className="mt-1 text-xs text-slate-600">{props.hint}</p> : null}
    </article>
  );
}

export function InsightBox(props: { title: string; lines: string[] }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
      <h3 className="text-sm font-semibold text-slate-900">{props.title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {props.lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </article>
  );
}

export function ReportTable(props: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#1e3a67] text-slate-100">
          <tr>
            {props.headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr
              key={`${row[0]}-${index}`}
              className={`border-t border-slate-200 text-slate-700 ${
                index % 2 === 0 ? "bg-[#f8fbfe]" : "bg-white"
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cellIndex}-${cell}`}
                  className={`px-3 py-2 ${cellIndex === 0 ? "font-semibold" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyBars(props: { rows: MonthRow[] }) {
  const maxKg = Math.max(1, ...props.rows.map((row) => row.kg));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Serie mensuelle (kg collectes)</h3>
      <div className="mt-3 space-y-2">
        {props.rows.map((row) => (
          <div
            key={row.month}
            className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-xs text-slate-700"
          >
            <span className="font-semibold uppercase tracking-wide text-slate-500">{row.month}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2b6d89] to-[#62a4b8]"
                style={{ width: `${Math.max(4, Math.round((row.kg / maxKg) * 100))}%` }}
              />
            </div>
            <span className="font-semibold">{toFrNumber(row.kg)} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GeoCoverageRing(props: { coveragePercent: number; tracePercent: number }) {
  const pct = Math.max(0, Math.min(100, props.coveragePercent));
  const circumference = 2 * Math.PI * 48;
  const dash = (pct / 100) * circumference;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Couverture spatiale</h3>
      <div className="mt-3 flex items-center gap-4">
        <svg width="116" height="116" viewBox="0 0 116 116" role="img" aria-label="Couverture geographique">
          <circle cx="58" cy="58" r="48" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="58"
            cy="58"
            r="48"
            fill="none"
            stroke="#1f6d86"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 58 58)"
          />
          <text x="58" y="58" textAnchor="middle" dy="0.2em" className="fill-slate-900 text-[18px] font-semibold">
            {Math.round(pct)}%
          </text>
        </svg>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Taux geolocalisation: <span className="font-semibold">{toFrNumber(pct, 0)}%</span>
          </p>
          <p>
            Taux de traces/polygones:{" "}
            <span className="font-semibold">
              {toFrNumber(Math.max(0, Math.min(100, props.tracePercent)), 0)}%
            </span>
          </p>
          <p className="text-xs text-slate-500">
            Mesure cle pour piloter les zones de recurrence et la preuve d&apos;impact.
          </p>
        </div>
      </div>
    </article>
  );
}
