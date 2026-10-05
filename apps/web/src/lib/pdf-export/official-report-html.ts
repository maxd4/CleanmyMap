import { escapeHtml } from "@/lib/security/html-escape";
import { buildOfficialReportCss } from "./report-pdf-theme";
import { renderInlineMarkdown } from "./official-report-markdown";
import {
  renderChapter,
  renderRows,
  renderStats,
  renderWebHero,
} from "./official-report-sections";
import { formatPdfValue } from "./format-pdf-value";
import type { PdfReportPayload } from "./simple-pdf";

export { renderOfficialMarkdown } from "./official-report-markdown";

function formatGeneratedAt(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value ?? "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
}

export function buildOfficialReportHtml(payload: PdfReportPayload): string {
  const generatedAt = formatGeneratedAt(payload.data.generatedAt);
  const title = payload.title || payload.data.title || "Rapport CleanMyMap";
  const summary = payload.data.summary?.filter((line) => line.trim().length > 0) ?? [];
  const hasSummary = summary.length > 0;
  const hasStats = Boolean(payload.data.stats?.length);
  const hasChapters = Boolean(payload.data.chapters?.length);
  const hasRows = Boolean(payload.data.rows?.length);
  const chapters = payload.data.chapters ?? [];
  const heroChapter = chapters[0] ?? null;
  const sectionChapters = chapters.slice(1);

  if (hasChapters && heroChapter) {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildOfficialReportCss()}</style>
</head>
<body>
  <main class="cmm-report cmm-web-shell">
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
      </div>
    </div>
  </main>
</body>
</html>`;
  }

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${buildOfficialReportCss()}</style>
</head>
<body>
  <main class="cmm-report">
    <section class="cmm-page cmm-cover">
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

    <section class="cmm-page">
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
                  ${payload.data.chapters!
                    .map((chapter, index) => `<li><a href="#chapter-${index + 1}">${escapeHtml(chapter.title)}</a></li>`)
                    .join("")}
                </ul>
              </div>
            </section>
            ${payload.data.chapters!.map((chapter, index) => renderChapter(chapter, index)).join("\n")}
          `
          : ""
      }
      ${renderStats(payload)}
      ${renderRows(payload)}
      <section class="cmm-section">
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
    </section>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
}
