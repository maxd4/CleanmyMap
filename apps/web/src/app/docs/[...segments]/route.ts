import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

function resolveDocumentationPath(segments: string[]) {
  const resolved = path.resolve(DOCUMENTATION_ROOT, ...segments);
  if (!resolved.startsWith(DOCUMENTATION_ROOT)) {
    return null;
  }
  return resolved;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanTitle(title: string) {
  return title
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function renderInlineMarkdown(value: string): string {
  const escaped = escapeHtml(value);
  const withCode = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withLinks = withCode.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g,
    (_match, label: string, href: string, title?: string) => {
      const safeTitle = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${safeTitle}>${label}</a>`;
    },
  );

  return withLinks
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
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

  if (rows.length < 2) {
    return lines.map((line) => `<p>${renderInlineMarkdown(line)}</p>`).join("");
  }

  const header = rows[0] ?? [];
  const bodyRows = rows.slice(2);

  return `
    <div class="cmm-doc-table-wrap">
      <table>
        <thead>
          <tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${bodyRows
            .map(
              (row) =>
                `<tr>${header.map((_, index) => `<td>${renderInlineMarkdown(row[index] ?? "")}</td>`).join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const paragraphLines: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
    paragraphLines.length = 0;
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      const language = trimmed.slice(3).trim();
      index += 1;
      const codeLines: string[] = [];

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      html.push(`
        <pre class="cmm-doc-code">
          ${language ? `<div class="cmm-doc-code-lang">${escapeHtml(language)}</div>` : ""}
          <code>${escapeHtml(codeLines.join("\n"))}</code>
        </pre>
      `);

      if (index < lines.length) {
        index += 1;
      }
      continue;
    }

    if (trimmed.startsWith(":::")) {
      flushParagraph();
      const kind = trimmed.replace(/^:::\s*/, "").trim();
      const allowedKind = kind === "important" || kind === "limite" ? kind : "note";
      const body: string[] = [];
      index += 1;

      while (index < lines.length && (lines[index] ?? "").trim() !== ":::") {
        body.push(lines[index] ?? "");
        index += 1;
      }

      html.push(`
        <aside class="cmm-doc-callout cmm-doc-callout-${allowedKind}">
          <div class="cmm-doc-callout-title">${
            allowedKind === "limite" ? "Limite" : allowedKind === "important" ? "Important" : "Note"
          }</div>
          ${renderMarkdown(body.join("\n"))}
        </aside>
      `);

      if (index < lines.length) {
        index += 1;
      }
      continue;
    }

    if (trimmed.startsWith("|") && (lines[index + 1] ?? "").includes("---")) {
      flushParagraph();
      const tableLines: string[] = [];

      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }

      html.push(renderTable(tableLines));
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      const items: string[] = [];

      while (index < lines.length) {
        const current = (lines[index] ?? "").trim();
        if (!current.startsWith("- ") && !current.startsWith("* ")) {
          break;
        }
        items.push(current.slice(2));
        index += 1;
      }

      html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];

      while (index < lines.length) {
        const current = (lines[index] ?? "").trim();
        if (!/^\d+\.\s/.test(current)) {
          break;
        }
        items.push(current.replace(/^\d+\.\s/, ""));
        index += 1;
      }

      html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];

      while (index < lines.length && (lines[index] ?? "").trim().startsWith(">")) {
        quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }

      html.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      html.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      html.push(`<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      html.push(`<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`);
      index += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      flushParagraph();
      html.push("<hr />");
      index += 1;
      continue;
    }

    paragraphLines.push(trimmed);
    index += 1;
  }

  flushParagraph();
  return html.join("\n");
}

function buildViewerHtml(params: {
  title: string;
  kind: "markdown" | "image" | "text";
  body: string;
  subtitle?: string;
  extra?: string;
}) {
  const { title, kind, body, subtitle, extra } = params;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f172a;
      --panel: rgba(15, 23, 42, 0.72);
      --panel-2: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.10);
      --text: #f8fafc;
      --muted: rgba(226, 232, 240, 0.78);
      --accent: #fb7185;
      --accent-2: #f59e0b;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(251, 113, 133, 0.16), transparent 32%),
        linear-gradient(180deg, #111827 0%, #0f172a 38%, #020617 100%);
      color: var(--text);
    }

    a {
      color: #93c5fd;
      text-decoration: none;
    }

    a:hover { text-decoration: underline; }

    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 32px auto 48px;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: 32px;
      background: var(--panel);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(18px);
    }

    .hero {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 4px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 28px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.24);
      color: #fdba74;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }

    h1 {
      margin: 14px 0 0;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
    }

    .subtitle {
      margin: 14px 0 0;
      max-width: 74ch;
      color: var(--muted);
      font-size: 1.02rem;
      line-height: 1.7;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      background: var(--panel-2);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
    }

    .content {
      color: rgba(248, 250, 252, 0.96);
      font-size: 1rem;
      line-height: 1.8;
    }

    .content h2,
    .content h3 {
      margin: 2.1em 0 0.6em;
      line-height: 1.15;
      letter-spacing: -0.03em;
    }

    .content h2 { font-size: 1.7rem; }
    .content h3 { font-size: 1.3rem; }
    .content p { margin: 0 0 1.05em; color: rgba(248, 250, 252, 0.92); }
    .content ul,
    .content ol { margin: 0 0 1.2em 1.4em; padding: 0; }
    .content li { margin: 0.35em 0; }
    .content blockquote {
      margin: 1.3em 0;
      padding: 0.9em 1.1em;
      border-left: 4px solid rgba(251, 113, 133, 0.7);
      background: rgba(255, 255, 255, 0.04);
      border-radius: 0 16px 16px 0;
    }
    .content hr {
      margin: 2.2em 0;
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.10);
    }
    .content code {
      padding: 0.12em 0.35em;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.93em;
    }
    .content pre {
      margin: 1.2em 0;
      padding: 1rem 1.1rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      background: rgba(2, 6, 23, 0.72);
      overflow-x: auto;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }
    .content pre code {
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 0.92rem;
      line-height: 1.7;
      color: #e2e8f0;
    }
    .cmm-doc-code-lang {
      margin-bottom: 0.6rem;
      color: #fdba74;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    .cmm-doc-callout {
      margin: 1.2em 0;
      padding: 1rem 1.1rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
    .cmm-doc-callout-title {
      margin-bottom: 0.75rem;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #fcd34d;
    }

    .cmm-doc-table-wrap {
      margin: 1.2em 0;
      overflow-x: auto;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 560px;
    }
    th, td {
      padding: 0.8rem 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: rgba(255, 255, 255, 0.05);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #f8fafc;
    }
    td { color: rgba(226, 232, 240, 0.92); }

    figure {
      margin: 0;
      padding: 0;
    }
    .image-panel {
      display: grid;
      gap: 18px;
      justify-items: center;
      padding: 12px 0 0;
    }
    .image-panel img {
      display: block;
      width: 100%;
      max-width: 1400px;
      height: auto;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
      background: rgba(255, 255, 255, 0.02);
    }
    .image-caption {
      max-width: 80ch;
      color: var(--muted);
      text-align: center;
      font-size: 0.95rem;
      line-height: 1.7;
    }

    .footer {
      margin-top: 30px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(226, 232, 240, 0.64);
      font-size: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      align-items: center;
    }

    @media (max-width: 720px) {
      .shell { width: min(100% - 16px, 100%); margin: 8px auto 18px; padding: 16px; border-radius: 24px; }
      .hero { margin-bottom: 20px; }
      .content { font-size: 0.98rem; line-height: 1.72; }
      .content h2 { font-size: 1.4rem; }
      .content h3 { font-size: 1.15rem; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <div>
        <div class="eyebrow">${kind === "image" ? "Image de documentation" : kind === "markdown" ? "Lecteur de documentation" : "Document"}</div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
      </div>
      <div class="meta">
        <span class="badge">${kind === "image" ? "Aperçu image" : kind === "markdown" ? "Markdown rendu" : "Texte brut"}</span>
        <span class="badge">${escapeHtml(extra ?? "CleanMyMap")}</span>
      </div>
    </header>

    <section class="content">
      ${body}
    </section>

    <footer class="footer">
      <span>CleanMyMap documentation viewer</span>
      <span>Ouvre le contenu directement dans le site, sans téléchargement forcé.</span>
    </footer>
  </main>
</body>
</html>`;
}

async function buildResponseForFile(filePath: string, filename: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".md") {
    const markdown = await readFile(filePath, "utf8");
    const html = buildViewerHtml({
      title: cleanTitle(filename),
      kind: "markdown",
      body: renderMarkdown(markdown),
      subtitle: `Fichier source: ${path.relative(DOCUMENTATION_ROOT, filePath).replace(/\\/g, "/")}`,
      extra: "Markdown",
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  if (ext === ".webp" || ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif" || ext === ".svg") {
    const content = await readFile(filePath);
    const mimeType = getContentType(filePath).split(";")[0] ?? "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${content.toString("base64")}`;
    const html = buildViewerHtml({
      title: cleanTitle(filename),
      kind: "image",
      body: `
        <figure class="image-panel">
          <img src="${dataUrl}" alt="${escapeHtml(cleanTitle(filename))}" />
          <figcaption class="image-caption">
            Image affichée directement dans le site. Elle sert de support visuel pour la documentation des quotas et ne déclenche pas de téléchargement.
          </figcaption>
        </figure>
      `,
      subtitle: `Aperçu du fichier: ${path.relative(DOCUMENTATION_ROOT, filePath).replace(/\\/g, "/")}`,
      extra: "Image",
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  if (ext === ".json") {
    const content = await readFile(filePath, "utf8");
    const html = buildViewerHtml({
      title: cleanTitle(filename),
      kind: "text",
      body: `<pre class="cmm-doc-code"><code>${escapeHtml(content)}</code></pre>`,
      subtitle: `Fichier source: ${path.relative(DOCUMENTATION_ROOT, filePath).replace(/\\/g, "/")}`,
      extra: "JSON",
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const content = await readFile(filePath, "utf8");
  const html = buildViewerHtml({
    title: cleanTitle(filename),
    kind: "text",
    body: `<pre class="cmm-doc-code"><code>${escapeHtml(content)}</code></pre>`,
    subtitle: `Fichier source: ${path.relative(DOCUMENTATION_ROOT, filePath).replace(/\\/g, "/")}`,
    extra: "Texte",
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await context.params;
  const resolvedPath = resolveDocumentationPath(segments);

  if (!resolvedPath) {
    return NextResponse.json({ status: "error", error: "Document invalide." }, { status: 400 });
  }

  try {
    const filename = segments.at(-1) ?? "document";
    return await buildResponseForFile(resolvedPath, filename);
  } catch {
    return NextResponse.json(
      { status: "error", error: "Document introuvable." },
      { status: 404 },
    );
  }
}
