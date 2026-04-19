import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGET = join(ROOT, "documentation", "du", "session", "latest-session.md");
const SECTIONS = ["Done", "In Progress", "Next", "Risks"];
const DEFAULT_MAX_LINES = 140;
const MAX_ITEMS_PER_SECTION = 8;

function parseArgs(argv) {
  const out = {
    done: [],
    progress: [],
    next: [],
    risk: [],
    reset: false,
    print: false,
    maxLines: DEFAULT_MAX_LINES,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--done" && argv[i + 1]) {
      out.done.push(argv[++i]);
      continue;
    }
    if (token === "--progress" && argv[i + 1]) {
      out.progress.push(argv[++i]);
      continue;
    }
    if (token === "--next" && argv[i + 1]) {
      out.next.push(argv[++i]);
      continue;
    }
    if (token === "--risk" && argv[i + 1]) {
      out.risk.push(argv[++i]);
      continue;
    }
    if (token === "--max-lines" && argv[i + 1]) {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value > 50) {
        out.maxLines = Math.trunc(value);
      }
      continue;
    }
    if (token === "--reset") {
      out.reset = true;
      continue;
    }
    if (token === "--print") {
      out.print = true;
      continue;
    }
  }

  return out;
}

function emptyState() {
  return {
    "Done": [],
    "In Progress": [],
    "Next": [],
    "Risks": [],
  };
}

function parseExisting(content) {
  const state = emptyState();
  let current = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^##\s+(Done|In Progress|Next|Risks)\s*$/);
    if (heading) {
      current = heading[1];
      continue;
    }
    if (!current) {
      continue;
    }
    const item = line.match(/^\-\s+(.+)$/);
    if (item) {
      state[current].push(item[1].trim());
    }
  }

  return state;
}

function normalizeItems(items) {
  const deduped = [];
  const seen = new Set();

  for (const value of items) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      continue;
    }
    if (seen.has(trimmed.toLowerCase())) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    deduped.push(trimmed);
  }

  return deduped.slice(0, MAX_ITEMS_PER_SECTION);
}

function buildMarkdown(state) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ["# Latest Session", "", `Updated: ${today}`, ""];

  for (const section of SECTIONS) {
    lines.push(`## ${section}`);
    const items = normalizeItems(state[section]);
    if (items.length === 0) {
      lines.push("- None.");
    } else {
      for (const item of items) {
        lines.push(`- ${item}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function trimLines(content, maxLines) {
  const lines = content.split(/\r?\n/);
  if (lines.length <= maxLines) {
    return content;
  }
  return lines.slice(0, maxLines).join("\n").trimEnd() + "\n";
}

function main() {
  const args = parseArgs(process.argv);
  const existing = !args.reset && existsSync(TARGET) ? readFileSync(TARGET, "utf8") : "";
  const state = existing ? parseExisting(existing) : emptyState();

  state["Done"].unshift(...args.done);
  state["In Progress"].unshift(...args.progress);
  state["Next"].unshift(...args.next);
  state["Risks"].unshift(...args.risk);

  const built = buildMarkdown(state);
  const finalContent = trimLines(built, args.maxLines);
  writeFileSync(TARGET, finalContent, "utf8");

  if (args.print) {
    process.stdout.write(finalContent);
  } else {
    console.log(`Updated: ${TARGET}`);
  }
}

main();
