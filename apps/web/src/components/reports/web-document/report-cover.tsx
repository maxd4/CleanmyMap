"use client";

import { buildExecutiveNarrative } from "@/lib/reports/report-model/builders";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { toFrNumber } from "@/lib/reports/report-model/formatters";
import { ReportCoverDetails, ReportCoverHero } from "./report-cover-sections";

type ReportCoverProps = { id?: string; report: ReportModel; activeScopeLabel: string; chapterCount?: number };

export function ReportCover({ id = "synthese-executive", report, activeScopeLabel, chapterCount }: ReportCoverProps) {
  const narrative = buildExecutiveNarrative(report);
  const wasteKnown = report.totals.knownWasteActions === undefined || report.totals.knownWasteActions > 0;
  const wasteLabel = wasteKnown ? `${toFrNumber(report.totals.kg)} kg` : "Non renseignée";
  return <section id={id} className="break-after-page overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)]"><div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]"><ReportCoverHero report={report} activeScopeLabel={activeScopeLabel} narrative={narrative} wasteLabel={wasteLabel} /><ReportCoverDetails report={report} narrative={narrative} chapterCount={chapterCount} /></div></section>;
}
