import type { SpogomiImportFormat } from "./types";

export function decodeDelimitedText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "windows-1252" } {
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const payload = hasUtf8Bom ? bytes.slice(3) : bytes;
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(payload), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(payload), encoding: "windows-1252" };
  }
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (line[index] === delimiter && !quoted) count += 1;
  }
  return count;
}

export function detectDelimiter(text: string, extension: SpogomiImportFormat): string {
  if (extension === "tsv") return "\t";
  const sample = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 5).join("\n");
  return Array.from([";", ",", "\t"] as const).sort((a: string, b: string) => countDelimiter(sample, b) - countDelimiter(sample, a))[0] ?? ";";
}

type DelimitedState = {
  row: string[];
  field: string;
  quoted: boolean;
  rowHasData: boolean;
};

function consumeDelimitedCharacter(state: DelimitedState, character: string, nextCharacter: string | undefined, delimiter: string): "append" | "push" | "skip" {
  if (character === '"') {
    if (state.quoted && nextCharacter === '"') {
      state.field += '"';
      return "skip";
    }
    state.quoted = !state.quoted;
    state.rowHasData = true;
    return "append";
  }
  if (character === delimiter && !state.quoted) {
    state.row.push(state.field);
    state.field = "";
    state.rowHasData = true;
    return "append";
  }
  if ((character === "\n" || character === "\r") && !state.quoted) return "push";
  state.field += character;
  if (character.trim()) state.rowHasData = true;
  return "append";
}

export function parseDelimited(text: string, delimiter: string): { rows: string[][]; malformedRowNumbers: number[] } {
  const rows: string[][] = [];
  const malformedRowNumbers: number[] = [];
  const state: DelimitedState = { row: [], field: "", quoted: false, rowHasData: false };
  let sourceRow = 1;
  const pushRow = () => {
    if (state.row.some((cell) => cell.trim()) || state.rowHasData) rows.push([...state.row, state.field]);
    state.row = [];
    state.field = "";
    state.rowHasData = false;
    sourceRow += 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const action = consumeDelimitedCharacter(state, character, text[index + 1], delimiter);
    if (action === "skip") index += 1;
    if (action === "push") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      pushRow();
    }
  }
  if (state.field || state.row.length || state.rowHasData) pushRow();
  if (state.quoted) malformedRowNumbers.push(sourceRow);
  return { rows, malformedRowNumbers };
}
