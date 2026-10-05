export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function renderCodeBlock(lines: string[], startIndex: number) {
  const language = (lines[startIndex] ?? "").trim().slice(3).trim();
  let index = startIndex + 1;
  const codeLines: string[] = [];

  while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
    codeLines.push(lines[index] ?? "");
    index += 1;
  }

  const html = `
        <pre class="cmm-doc-code">
          ${language ? `<div class="cmm-doc-code-lang">${escapeHtml(language)}</div>` : ""}
          <code>${escapeHtml(codeLines.join("\n"))}</code>
        </pre>
      `;

  return { html, nextIndex: index < lines.length ? index + 1 : index };
}

function renderCallout(lines: string[], startIndex: number) {
  const kind = (lines[startIndex] ?? "").trim().replace(/^:::\s*/, "").trim();
  const allowedKind = kind === "important" || kind === "limite" ? kind : "note";
  const body: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length && (lines[index] ?? "").trim() !== ":::") {
    body.push(lines[index] ?? "");
    index += 1;
  }

  const html = `
        <aside class="cmm-doc-callout cmm-doc-callout-${allowedKind}">
          <div class="cmm-doc-callout-title">${
            allowedKind === "limite" ? "Limite" : allowedKind === "important" ? "Important" : "Note"
          }</div>
          ${renderMarkdown(body.join("\n"))}
        </aside>
      `;

  return { html, nextIndex: index < lines.length ? index + 1 : index };
}

function renderTableBlock(lines: string[], startIndex: number) {
  const tableLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
    tableLines.push(lines[index] ?? "");
    index += 1;
  }

  return { html: renderTable(tableLines), nextIndex: index };
}

function renderListBlock(lines: string[], startIndex: number, ordered: boolean) {
  const items: string[] = [];
  let index = startIndex;
  const isListItem = (line: string) => ordered ? /^\d+\.\s/.test(line) : line.startsWith("- ") || line.startsWith("* ");

  while (index < lines.length) {
    const current = (lines[index] ?? "").trim();
    if (!isListItem(current)) {
      break;
    }
    items.push(ordered ? current.replace(/^\d+\.\s/, "") : current.slice(2));
    index += 1;
  }

  const tag = ordered ? "ol" : "ul";
  return {
    html: `<${tag}>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`,
    nextIndex: index,
  };
}

function renderQuoteBlock(lines: string[], startIndex: number) {
  const quoteLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && (lines[index] ?? "").trim().startsWith(">")) {
    quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
    index += 1;
  }

  return { html: `<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`, nextIndex: index };
}

export function renderMarkdown(markdown: string): string {
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
      const block = renderCodeBlock(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (trimmed.startsWith(":::")) {
      flushParagraph();
      const block = renderCallout(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (trimmed.startsWith("|") && (lines[index + 1] ?? "").includes("---")) {
      flushParagraph();
      const block = renderTableBlock(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      const block = renderListBlock(lines, index, false);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      const block = renderListBlock(lines, index, true);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const block = renderQuoteBlock(lines, index);
      html.push(block.html);
      index = block.nextIndex;
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
