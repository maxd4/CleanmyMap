import { buildOfficialReportCss } from "./report-pdf-theme";
import type { PdfReportPayload } from "./simple-pdf";

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

export function buildOfficialReportHtml(payload: PdfReportPayload): string {
  const generatedAt = formatGeneratedAt(payload.data.generatedAt);
  const title = payload.title || payload.data.title || "Rapport CleanMyMap";
  const summary = payload.data.summary?.filter((line) => line.trim().length > 0) ?? [];
  const hasSummary = summary.length > 0;
  const hasStats = Boolean(payload.data.stats?.length);
  const hasRows = Boolean(payload.data.rows?.length);

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
