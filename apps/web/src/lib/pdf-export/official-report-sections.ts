import { escapeHtml } from "@/lib/security/html-escape";
import { formatPdfValue } from "./format-pdf-value";
import { renderInlineMarkdown } from "./official-report-markdown";
import type { PdfReportChapter, PdfReportPayload } from "./simple-pdf";

function formatGeneratedAt(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value ?? "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function renderStats(payload: PdfReportPayload): string {
  const stats = payload.data.stats ?? [];
  if (!stats.length) return "";

  return `
    <section class="cmm-section">
      <h2 class="cmm-section-title">Indicateurs</h2>
      <div class="cmm-stat-grid">
        ${stats
          .map(
            (stat) => `
              <article class="cmm-card">
                <div class="cmm-card-label">${escapeHtml(stat.label)}</div>
                <div class="cmm-card-value">${escapeHtml(formatPdfValue(stat.value))}</div>
                ${stat.detail ? `<p class="cmm-muted">${escapeHtml(stat.detail)}</p>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderRows(payload: PdfReportPayload): string {
  const rows = payload.data.rows ?? [];
  if (!rows.length) return "";
  const columns =
    payload.data.columns ??
    Object.keys(rows[0] ?? {}).map((key) => ({ key, label: key }));
  const visibleRows = rows.slice(0, 80);

  return `
    <section class="cmm-section">
      <h2 class="cmm-section-title">Données visibles</h2>
      <div class="cmm-table-wrap">
        <table>
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${visibleRows
              .map(
                (row) => `
                  <tr>
                    ${columns.map((column) => `<td>${escapeHtml(formatPdfValue(row[column.key]))}</td>`).join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${
        rows.length > visibleRows.length
          ? `<p class="cmm-muted">${rows.length - visibleRows.length} ligne(s) supplémentaire(s) non affichée(s) dans cette version PDF.</p>`
          : ""
      }
    </section>
  `;
}

function renderChapterHeader(chapter: PdfReportChapter, index: number, isLocked: boolean): string {
  return `
      <div class="cmm-web-section__header">
        <div class="cmm-web-section__header-top">
          <p class="cmm-kicker">Chapitre ${index + 1}</p>
          ${isLocked ? `<span class="cmm-web-section__badge">Section verrouillée${chapter.requiredDetailLevelLabel ? ` · ${escapeHtml(chapter.requiredDetailLevelLabel)}` : ""}</span>` : ""}
        </div>
        <h2 class="cmm-web-section__title">${escapeHtml(chapter.title)}</h2>
        ${chapter.subtitle ? `<p class="cmm-web-section__subtitle">${escapeHtml(chapter.subtitle)}</p>` : ""}
      </div>`;
}

function renderChapterStats(chapter: PdfReportChapter, isLocked: boolean): string {
  if (isLocked || !chapter.stats?.length) return "";
  return `
        <div class="cmm-web-section__grid cmm-web-section__grid--${Math.min(4, Math.max(2, chapter.stats.length))}">
          ${chapter.stats
            .map(
              (stat) => `
                <article class="cmm-card">
                  <div class="cmm-card-label">${escapeHtml(stat.label)}</div>
                  <div class="cmm-card-value">${escapeHtml(formatPdfValue(stat.value))}</div>
                  ${stat.detail ? `<p class="cmm-muted">${escapeHtml(stat.detail)}</p>` : ""}
                </article>
              `,
            )
            .join("")}
        </div>`;
}

function renderChapterRows(chapter: PdfReportChapter, isLocked: boolean): string {
  if (isLocked || !chapter.rows?.length) return "";
  const columns =
    chapter.columns ?? Object.keys(chapter.rows[0] ?? {}).map((key) => ({ key, label: key }));
  return `
        <div class="cmm-table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${chapter.rows
                .slice(0, 40)
                .map(
                  (row) => `
                    <tr>
                      ${columns.map((column) => `<td>${escapeHtml(formatPdfValue(row[column.key]))}</td>`).join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
}

export function renderChapter(chapter: PdfReportChapter, index: number): string {
  const isLocked = Boolean(chapter.locked);
  const lines = chapter.lines ?? [];
  const calloutClass = isLocked ? "locked" : "note";
  return `
    <section class="cmm-web-section${isLocked ? " is-locked" : ""}" id="${escapeHtml(chapter.id ?? `chapter-${index + 1}`)}">
      ${renderChapterHeader(chapter, index, isLocked)}
      <div class="cmm-web-section__body">
        ${lines.length ? `<div class="cmm-callout ${calloutClass}">${isLocked ? `<div class="cmm-callout-title">Lecture réduite</div>` : ""}${renderList(lines)}</div>` : ""}
        ${renderChapterStats(chapter, isLocked)}
        ${renderChapterRows(chapter, isLocked)}
      </div>
    </section>
  `;
}

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
}

export function renderWebHero(chapter: PdfReportChapter, payload: PdfReportPayload): string {
  const lines = chapter.lines ?? [];
  const stats = chapter.stats ?? [];
  return `
    <section class="cmm-web-hero" id="${escapeHtml(chapter.id ?? "synthese-executive")}">
      <div class="cmm-web-hero__left">
        <p class="cmm-web-header__kicker">Synthèse exécutive</p>
        <h1 class="cmm-web-header__title">${escapeHtml(chapter.title)}</h1>
        ${chapter.subtitle ? `<p class="cmm-web-header__subtitle">${escapeHtml(chapter.subtitle)}</p>` : ""}
        <div class="cmm-web-pill-row">
          <span class="cmm-web-pill">Rapport: ${escapeHtml(payload.rubrique)}</span>
          <span class="cmm-web-pill">Période: ${escapeHtml(payload.periode)}</span>
          <span class="cmm-web-pill">Généré le ${escapeHtml(formatGeneratedAt(payload.data.generatedAt))}</span>
        </div>
        ${payload.data.summary?.length ? `<div class="cmm-callout note"><ul>${payload.data.summary.filter((item) => item.trim()).map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul></div>` : ""}
        <div class="cmm-web-section__grid cmm-web-section__grid--${Math.min(4, Math.max(2, stats.length || 4))}">
          ${stats
            .map(
              (stat) => `
                <article class="cmm-card">
                  <div class="cmm-card-label">${escapeHtml(stat.label)}</div>
                  <div class="cmm-card-value">${escapeHtml(formatPdfValue(stat.value))}</div>
                  ${stat.detail ? `<p class="cmm-muted">${escapeHtml(stat.detail)}</p>` : ""}
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="cmm-web-hero__right">
        <article class="cmm-card">
          <div class="cmm-card-label">Vue d’ensemble du rapport</div>
          <div class="cmm-card-value">${escapeHtml(chapter.title)}</div>
          <p class="cmm-muted">${escapeHtml(chapter.subtitle ?? "")}</p>
        </article>
        ${lines.length ? `<div class="cmm-callout note">${renderList(lines)}</div>` : ""}
        <article class="cmm-card">
          <div class="cmm-card-label">Lecture rapide</div>
          <p class="cmm-muted">${escapeHtml(payload.data.summary?.[0] ?? "Aucune synthèse disponible.")}</p>
        </article>
      </div>
    </section>
  `;
}
