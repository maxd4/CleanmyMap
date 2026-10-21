import { escapeHtml } from "@/lib/security/html-escape";
import { buildOfficialReportCss, type ReportPdfTheme } from "./report-pdf-theme";
import { renderInlineMarkdown } from "./official-report-markdown";
import { renderChapter, renderRows, renderWebHero } from "./official-report-sections";
import { formatPdfValue } from "./format-pdf-value";
import type { PdfReportPayload } from "./simple-pdf";

export function buildWebReportHtml(
  payload: PdfReportPayload,
  title: string,
  generatedAt: string,
  theme?: ReportPdfTheme,
): string {
  const chapters = payload.data.chapters ?? [];
  const heroChapter = chapters[0] ?? null;
  const sectionChapters = chapters.slice(1);
  const hasStats = Boolean(payload.data.stats?.length);

  if (!heroChapter) return "";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildOfficialReportCss(theme)}</style>
</head>
<body>
  <main class="cmm-report cmm-web-shell" data-report-theme="${theme ?? "impact"}">
    <section class="cmm-web-header">
      <div class="cmm-web-header__top">
        <div>
          <p class="cmm-web-header__kicker">Livrable officiel CleanMyMap</p>
          <h1 class="cmm-web-header__title">${escapeHtml(title)}</h1>
          <p class="cmm-web-header__subtitle">
            Même structure que la vue web: bandeau de synthèse, sommaire latéral et chapitres
            détaillés dans un flux continu prêt à imprimer.
          </p>
        </div>
        <div class="cmm-web-header__meta">
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
      </div>
      <div class="cmm-web-pill-row">
        ${(payload.data.summary ?? [])
          .filter((line) => line.trim().length > 0)
          .slice(0, 3)
          .map((line) => `<span class="cmm-web-pill">${renderInlineMarkdown(line)}</span>`)
          .join("")}
      </div>
      ${
        hasStats
          ? `
            <div class="cmm-web-section__grid cmm-web-section__grid--4" style="margin-top: 4mm;">
              ${(payload.data.stats ?? [])
                .slice(0, 4)
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
          `
          : ""
      }
    </section>

    <div class="cmm-web-layout">
      <aside class="cmm-web-aside">
        <p class="cmm-kicker">Navigation</p>
        <h2 class="cmm-section-title">Sommaire cliquable</h2>
        <nav>
          ${chapters
            .map(
              (chapter, index) => `
                <a class="cmm-toc-item" href="#${escapeHtml(chapter.id ?? `chapter-${index + 1}`)}">
                  <span class="cmm-toc-title">${escapeHtml(chapter.title)}</span>
                  ${chapter.subtitle ? `<span class="cmm-toc-subtitle">${escapeHtml(chapter.subtitle)}</span>` : ""}
                </a>
              `,
            )
            .join("")}
        </nav>
        <div class="cmm-callout limite" style="margin-top:4mm;">
          <div class="cmm-callout-title">Lecture rapide</div>
          <p>Le document imprimable reprend la même architecture visuelle que la vue web, avec les mêmes sections et le même rythme de lecture.</p>
        </div>
      </aside>

      <div class="cmm-web-main">
        ${renderWebHero(heroChapter, payload)}
        ${sectionChapters.map((chapter, index) => renderChapter(chapter, index + 2)).join("\n")}
        ${renderRows(payload)}
      </div>
    </div>
  </main>
</body>
</html>`;
}
