import { escapeHtml } from "@/lib/security/html-escape";

type CalloutKind = "note" | "important" | "limite";

export function renderInlineMarkdown(value: string): string {
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

function renderCallout(lines: string[], startIndex: number): { html: string; nextIndex: number } {
  const kind = lines[startIndex]!.trim().replace(/^:::\s*/, "").trim() as CalloutKind;
  const allowedKind: CalloutKind = kind === "important" || kind === "limite" ? kind : "note";
  const body: string[] = [];
  let index = startIndex + 1;
  while (index < lines.length && (lines[index] ?? "").trim() !== ":::") {
    body.push(lines[index] ?? "");
    index += 1;
  }
  const title = allowedKind === "limite" ? "Limite" : allowedKind === "important" ? "Important" : "Note";
  return {
    html: `<div class="cmm-callout ${allowedKind}"><div class="cmm-callout-title">${title}</div>${renderOfficialMarkdown(body.join("\n"))}</div>`,
    nextIndex: index + 1,
  };
}

function renderTableBlock(lines: string[], startIndex: number): { html: string; nextIndex: number } {
  const tableLines: string[] = [];
  let index = startIndex;
  while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
    tableLines.push(lines[index] ?? "");
    index += 1;
  }
  return { html: renderTable(tableLines), nextIndex: index };
}

function renderListBlock(lines: string[], startIndex: number): { html: string; nextIndex: number } {
  const items: string[] = [];
  let index = startIndex;
  while (index < lines.length && (lines[index] ?? "").trim().startsWith("- ")) {
    items.push((lines[index] ?? "").trim().slice(2));
    index += 1;
  }
  return { html: renderList(items), nextIndex: index };
}

function renderHeadingOrParagraph(trimmed: string): string {
  if (trimmed.startsWith("### ")) {
    return `<h3 class="cmm-subtitle">${renderInlineMarkdown(trimmed.slice(4))}</h3>`;
  }
  if (trimmed.startsWith("## ")) {
    return `<h2 class="cmm-section-title">${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
  }
  if (trimmed.startsWith("# ")) {
    return `<h1 class="cmm-section-title">${renderInlineMarkdown(trimmed.slice(2))}</h1>`;
  }
  return `<p>${renderInlineMarkdown(trimmed)}</p>`;
}

export function renderOfficialMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = (lines[index] ?? "").trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (trimmed.startsWith(":::")) {
      const block = renderCallout(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }
    if (trimmed.startsWith("|") && (lines[index + 1] ?? "").includes("---")) {
      const block = renderTableBlock(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const block = renderListBlock(lines, index);
      html.push(block.html);
      index = block.nextIndex;
      continue;
    }
    html.push(renderHeadingOrParagraph(trimmed));
    index += 1;
  }

  return html.join("\n");
}
