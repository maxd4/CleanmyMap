import path from "node:path";
import { readFile } from "node:fs/promises";
import { escapeHtml } from "@/lib/security/html-escape";
import { getDocumentationContentType } from "./route-seo";
import { renderMarkdown } from "./route-markdown";
import { buildViewerHtml } from "./route-viewer";

function cleanTitle(title: string) {
  return title
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildTextResponse(
  filePath: string,
  filename: string,
  documentationRoot: string,
  extra: string,
) {
  const content = await readFile(filePath, "utf8");
  const html = buildViewerHtml({
    title: cleanTitle(filename),
    kind: "text",
    body: `<pre class="cmm-doc-code"><code>${escapeHtml(content)}</code></pre>`,
    subtitle: `Fichier source: ${path.relative(documentationRoot, filePath).replace(/\\/g, "/")}`,
    extra,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function buildResponseForFile(
  filePath: string,
  filename: string,
  documentationRoot: string,
) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".md") {
    const markdown = await readFile(filePath, "utf8");
    const html = buildViewerHtml({
      title: cleanTitle(filename),
      kind: "markdown",
      body: renderMarkdown(markdown),
      subtitle: `Fichier source: ${path.relative(documentationRoot, filePath).replace(/\\/g, "/")}`,
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
    const mimeType = getDocumentationContentType(filePath).split(";")[0] ?? "application/octet-stream";
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
      subtitle: `Aperçu du fichier: ${path.relative(documentationRoot, filePath).replace(/\\/g, "/")}`,
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
    return buildTextResponse(filePath, filename, documentationRoot, "JSON");
  }

  return buildTextResponse(filePath, filename, documentationRoot, "Texte");
}
