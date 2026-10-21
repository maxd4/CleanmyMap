import { escapeHtml } from "@/lib/security/html-escape";
import {
  buildOfficialReportCss,
  type ReportPdfTheme,
} from "./report-pdf-theme";
import {
  renderChapter,
  renderRows,
  renderStats,
} from "./official-report-sections";
import { renderInlineMarkdown } from "./official-report-markdown";
import type { PdfReportPayload } from "./simple-pdf";

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
}

function buildClassicCover(
  payload: PdfReportPayload,
  title: string,
  generatedAt: string,
): string {
  return `    <section class="cmm-page cmm-cover">
      <div>
        <p class="cmm-kicker">Livrable officiel CleanMyMap</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="cmm-cover-subtitle">Rapport généré depuis les données visibles du site, avec une mise en page A4 sobre et imprimable.</p>
      </div>
      <div class="cmm-meta-grid">
        <article class="cmm-card">
          <div class="cmm-card-label">Rubrique</div>
          <div class="cmm-card-value">${escapeHtml(payload.rubrique)}</div>
        </article>
        <article class="cmm-card">
          <div class="cmm-card-label">Période</div>
          <div class="cmm-card-value">${escapeHtml(payload.periode)}</div>
        </article>
        <article class="cmm-card">
          <div class="cmm-card-label">Organisation</div>
          <div class="cmm-card-value">${escapeHtml(payload.organizationName?.trim() || payload.organizationType)}</div>
        </article>
        <article class="cmm-card">
          <div class="cmm-card-label">Génération</div>
          <div class="cmm-card-value">${escapeHtml(generatedAt)}</div>
        </article>
      </div>
      <footer class="cmm-footer">
        <span>CleanMyMap - Rapport institutionnel imprimable</span>
        <span>Version web A4</span>
      </footer>
    </section>
`;
}

function buildClassicContents(
  payload: PdfReportPayload,
  summary: string[],
  hasSummary: boolean,
  hasStats: boolean,
  hasChapters: boolean,
  hasRows: boolean,
): string {
  return `    <section class="cmm-page">
      <section class="cmm-section">
        <p class="cmm-kicker">Navigation</p>
        <h2 class="cmm-section-title">Sommaire</h2>
        <ul>
          ${hasSummary ? "<li>Résumé</li>" : ""}
          ${hasChapters ? "<li>Chapitres détaillés</li>" : ""}
          ${hasStats ? "<li>Indicateurs</li>" : ""}
          ${hasRows ? "<li>Données visibles</li>" : ""}
          <li>Méthode et limites</li>
        </ul>
      </section>

      ${
        hasSummary
          ? `<section class="cmm-section"><h2 class="cmm-section-title">Résumé</h2><div class="cmm-callout note">${renderList(summary)}</div></section>`
          : ""
      }
      ${
        hasChapters
          ? `
            <section class="cmm-section">
              <h2 class="cmm-section-title">Chapitres détaillés</h2>
              <div class="cmm-callout note">
                <ul>
                  ${payload.data
                    .chapters!.map(
                      (chapter, index) =>
                        `<li><a href="#chapter-${index + 1}">${escapeHtml(chapter.title)}</a></li>`,
                    )
                    .join("")}
                </ul>
              </div>
            </section>
            ${payload.data.chapters!.map((chapter, index) => renderChapter(chapter, index)).join("\n")}
          `
          : ""
      }
      ${renderStats(payload)}
      ${renderRows(payload)}`;
}

function buildClassicMethodFooter(
  payload: PdfReportPayload,
  generatedAt: string,
): string {
  return `      <section class="cmm-section">
        <h2 class="cmm-section-title">Méthode et limites</h2>
        <div class="cmm-callout limite">
          <div class="cmm-callout-title">Limite de lecture</div>
          <p>Ce livrable reprend les données disponibles au moment de la génération. Les indicateurs restent des aides à la décision et ne remplacent pas un audit instrumenté.</p>
        </div>
      </section>
      <footer class="cmm-footer">
        <span>Document généré le ${escapeHtml(generatedAt)}</span>
        <span>${escapeHtml(payload.rubrique)} - ${escapeHtml(payload.periode)}</span>
      </footer>
    </section>`;
}

export function buildClassicReportHtml(
  payload: PdfReportPayload,
  title: string,
  generatedAt: string,
  summary: string[],
  hasSummary: boolean,
  hasStats: boolean,
  hasChapters: boolean,
  hasRows: boolean,
  theme?: ReportPdfTheme,
): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildOfficialReportCss(theme)}</style>
</head>
<body>
  <main class="cmm-report" data-report-theme="${theme ?? "impact"}">
${buildClassicCover(payload, title, generatedAt)}
${buildClassicContents(payload, summary, hasSummary, hasStats, hasChapters, hasRows)}
${buildClassicMethodFooter(payload, generatedAt)}
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
}
