import { escapeHtml } from "./route-markdown";

export type DocumentationViewerKind = "markdown" | "image" | "text";

const DOCUMENTATION_VIEWER_CSS = `
    :root { color-scheme: dark; --bg: #0f172a; --panel: rgba(15, 23, 42, 0.72); --panel-2: rgba(255, 255, 255, 0.04); --border: rgba(255, 255, 255, 0.10); --text: #FFFFFF; --muted: rgba(226, 232, 240, 0.78); --accent: #fb7185; --accent-2: #f59e0b; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top, rgba(251, 113, 133, 0.16), transparent 32%), linear-gradient(180deg, #111827 0%, #0f172a 38%, #020617 100%); color: var(--text); }
    a { color: #93c5fd; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell { width: min(1180px, calc(100% - 32px)); margin: 32px auto 48px; padding: 24px; border: 1px solid var(--border); border-radius: 32px; background: var(--panel); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); backdrop-filter: blur(18px); }
    .hero { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; padding: 12px 4px 28px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 28px; }
    .eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 999px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.24); color: #fdba74; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; }
    h1 { margin: 14px 0 0; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.05; letter-spacing: -0.04em; }
    .subtitle { margin: 14px 0 0; max-width: 74ch; color: var(--muted); font-size: 1.02rem; line-height: 1.7; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.10); background: var(--panel-2); color: var(--text); font-size: 12px; font-weight: 700; }
    .content { color: #FFFFFF; font-size: 1rem; line-height: 1.8; }
    .content h2, .content h3 { margin: 2.1em 0 0.6em; line-height: 1.15; letter-spacing: -0.03em; }
    .content h2 { font-size: 1.7rem; }
    .content h3 { font-size: 1.3rem; }
    .content p { margin: 0 0 1.05em; color: #FFFFFF; }
    .content ul, .content ol { margin: 0 0 1.2em 1.4em; padding: 0; }
    .content li { margin: 0.35em 0; }
    .content blockquote { margin: 1.3em 0; padding: 0.9em 1.1em; border-left: 4px solid rgba(251, 113, 133, 0.7); background: rgba(255, 255, 255, 0.04); border-radius: 0 16px 16px 0; }
    .content hr { margin: 2.2em 0; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.10); }
    .content code { padding: 0.12em 0.35em; border-radius: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.93em; }
    .content pre { margin: 1.2em 0; padding: 1rem 1.1rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.10); background: rgba(2, 6, 23, 0.72); overflow-x: auto; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03); }
    .content pre code { padding: 0; border: 0; background: transparent; font-size: 0.92rem; line-height: 1.7; color: #e2e8f0; }
    .cmm-doc-code-lang { margin-bottom: 0.6rem; color: #fdba74; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }
    .cmm-doc-callout { margin: 1.2em 0; padding: 1rem 1.1rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.04); }
    .cmm-doc-callout-title { margin-bottom: 0.75rem; font-size: 11px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #fcd34d; }
    .cmm-doc-table-wrap { margin: 1.2em 0; overflow-x: auto; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.04); }
    table { width: 100%; border-collapse: collapse; min-width: 560px; }
    th, td { padding: 0.8rem 0.9rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: left; vertical-align: top; }
    th { background: rgba(255, 255, 255, 0.05); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #FFFFFF; }
    td { color: rgba(226, 232, 240, 0.92); }
    figure { margin: 0; padding: 0; }
    .image-panel { display: grid; gap: 18px; justify-items: center; padding: 12px 0 0; }
    .image-panel img { display: block; width: 100%; max-width: 1400px; height: auto; border-radius: 28px; border: 1px solid rgba(255, 255, 255, 0.10); box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35); background: rgba(255, 255, 255, 0.02); }
    .image-caption { max-width: 80ch; color: var(--muted); text-align: center; font-size: 0.95rem; line-height: 1.7; }
    .footer { margin-top: 30px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: rgba(226, 232, 240, 0.64); font-size: 12px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; }
    @media (max-width: 720px) { .shell { width: min(100% - 16px, 100%); margin: 8px auto 18px; padding: 16px; border-radius: 24px; } .hero { margin-bottom: 20px; } .content { font-size: 0.98rem; line-height: 1.72; } .content h2 { font-size: 1.4rem; } .content h3 { font-size: 1.15rem; } }
`;

export function buildViewerHtml(params: {
  title: string;
  kind: DocumentationViewerKind;
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
  <style>${DOCUMENTATION_VIEWER_CSS}</style>
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
