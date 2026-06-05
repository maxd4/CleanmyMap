import { buildOfficialReportCss } from "./report-pdf-theme";
import type { PdfReportChapter, PdfReportPayload } from "./simple-pdf";

type CalloutKind = "note" | "important" | "limite";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

function formatGeneratedAt(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value ?? "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
}

function renderTable(lines: string[]): string {
  const rows = lines
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell, index, arr) => !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === "")),
    )
    .filter((cells) => cells.length > 0);

  if (rows.length < 2) return lines.map((line) => `<p>${renderInlineMarkdown(line)}</p>`).join("");

  const header = rows[0] ?? [];
  const bodyRows = rows.slice(2);

  return `
    <div class="cmm-table-wrap">
      <table>
        <thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>
        <tbody>
          ${bodyRows
            .map((row) => `<tr>${header.map((_, index) => `<td>${renderInlineMarkdown(row[index] ?? "")}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderOfficialMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith(":::")) {
      const kind = trimmed.replace(/^:::\s*/, "").trim() as CalloutKind;
      const allowedKind: CalloutKind = kind === "important" || kind === "limite" ? kind : "note";
      const body: string[] = [];
      index += 1;
      while (index < lines.length && (lines[index] ?? "").trim() !== ":::") {
        body.push(lines[index] ?? "");
        index += 1;
      }
      html.push(`<div class="cmm-callout ${allowedKind}"><div class="cmm-callout-title">${allowedKind === "limite" ? "Limite" : allowedKind === "important" ? "Important" : "Note"}</div>${renderOfficialMarkdown(body.join("\n"))}</div>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|") && (lines[index + 1] ?? "").includes("---")) {
      const tableLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("- ")) {
        items.push((lines[index] ?? "").trim().slice(2));
        index += 1;
      }
      html.push(renderList(items));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3 class="cmm-subtitle">${renderInlineMarkdown(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      html.push(`<h2 class="cmm-section-title">${renderInlineMarkdown(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      html.push(`<h1 class="cmm-section-title">${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
    } else {
      html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    }

    index += 1;
  }

  return html.join("\n");
}

function renderStats(payload: PdfReportPayload): string {
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
                <div class="cmm-card-value">${escapeHtml(formatValue(stat.value))}</div>
                ${stat.detail ? `<p class="cmm-muted">${escapeHtml(stat.detail)}</p>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRows(payload: PdfReportPayload): string {
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
                    ${columns.map((column) => `<td>${escapeHtml(formatValue(row[column.key]))}</td>`).join("")}
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

function renderChapter(chapter: PdfReportChapter, index: number): string {
  const lines = chapter.lines ?? [];
  const isLocked = Boolean(chapter.locked);
  const hasStats = Boolean(chapter.stats?.length);
  const hasRows = Boolean(chapter.rows?.length);
  const columns =
    chapter.columns ?? Object.keys(chapter.rows?.[0] ?? {}).map((key) => ({ key, label: key }));
  const calloutClass = isLocked ? "locked" : "note";

  return `
    <section class="cmm-web-section${isLocked ? " is-locked" : ""}" id="${escapeHtml(chapter.id ?? `chapter-${index + 1}`)}">
      <div class="cmm-web-section__header">
        <div class="cmm-web-section__header-top">
          <p class="cmm-kicker">Chapitre ${index + 1}</p>
          ${isLocked ? `<span class="cmm-web-section__badge">Section verrouillée${chapter.requiredDetailLevelLabel ? ` · ${escapeHtml(chapter.requiredDetailLevelLabel)}` : ""}</span>` : ""}
        </div>
        <h2 class="cmm-web-section__title">${escapeHtml(chapter.title)}</h2>
        ${chapter.subtitle ? `<p class="cmm-web-section__subtitle">${escapeHtml(chapter.subtitle)}</p>` : ""}
      </div>
      <div class="cmm-web-section__body">
        ${lines.length ? `<div class="cmm-callout ${calloutClass}">${isLocked ? `<div class="cmm-callout-title">Lecture réduite</div>` : ""}${renderList(lines)}</div>` : ""}
        ${
          !isLocked && hasStats
            ? `
              <div class="cmm-web-section__grid cmm-web-section__grid--${Math.min(4, Math.max(2, chapter.stats!.length))}">
                ${chapter.stats!
                  .map(
                    (stat) => `
                      <article class="cmm-card">
                        <div class="cmm-card-label">${escapeHtml(stat.label)}</div>
                        <div class="cmm-card-value">${escapeHtml(formatValue(stat.value))}</div>
                        ${stat.detail ? `<p class="cmm-muted">${escapeHtml(stat.detail)}</p>` : ""}
                      </article>
                    `,
                  )
                  .join("")}
              </div>
            `
            : ""
        }
        ${
          !isLocked && hasRows
            ? `
              <div class="cmm-table-wrap">
                <table>
                  <thead>
                    <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
                  </thead>
                  <tbody>
                    ${chapter.rows!
                      .slice(0, 40)
                      .map(
                        (row) => `
                          <tr>
                            ${columns.map((column) => `<td>${escapeHtml(formatValue(row[column.key]))}</td>`).join("")}
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function renderWebHero(chapter: PdfReportChapter, payload: PdfReportPayload): string {
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
                  <div class="cmm-card-value">${escapeHtml(formatValue(stat.value))}</div>
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
                      <div class="cmm-card-value">${escapeHtml(formatValue(stat.value))}</div>
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

export const __testing = {
  escapeHtml,
};
