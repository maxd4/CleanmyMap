#!/usr/bin/env node

import path from "node:path";

import { createRepositoryView } from "../checks/repository-view.mjs";
import { measureContent } from "../checks/top-heavy-measurement.mjs";

const DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION = 1;
const DOCUMENTATION_EXTENSIONS = Object.freeze([".md", ".mdx"]);
export const DOCUMENTATION_THRESHOLDS = Object.freeze({
  surveillance: 601,
  reviewRequired: 1_001,
  architectureReview: 1_501,
});

const LIFECYCLE_STATUSES = Object.freeze(["CURRENT", "PLAN", "AUDIT", "HISTORY", "SNAPSHOT", "ADR", "GENERATED"]);
const FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;
const ATX_HEADING_PATTERN = /^[ \t]{0,3}(#{1,6})(?:[ \t]+|$)(.*)$/;
const SETEXT_HEADING_PATTERN = /^[ \t]{0,3}(=+|-+)[ \t]*$/;
const GENERATED_MARKER_PATTERN = /^(?:generated|auto-generated|ne pas modifier)/i;
const ANCHOR_ID_PATTERN = /\b(?:id|name)=["']([^"']+)["']/gi;
const LOCAL_LINK_EXTENSIONS = new Set([".md", ".mdx", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"]);
const EXTERNAL_HOST_PATTERN = /^(?:www\.)?[^/#\s?:]+\.(?:com|org|net|edu|gov|mil|int|io|ai|app|dev|co|uk|fr|de|be|nl|es|it|ca|us|info|biz|xyz)(?:[/:?#]|$)/i;

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function isDocumentationFile(file) {
  return DOCUMENTATION_EXTENSIONS.includes(path.posix.extname(file).toLowerCase());
}

function hasGeneratedMarker(lines) {
  return lines.slice(0, 12).some((line) => {
    const trimmed = line.trimStart();
    const commentIndex = trimmed.indexOf("<!--");
    if (commentIndex >= 0 && GENERATED_MARKER_PATTERN.test(trimmed.slice(commentIndex + 4).trimStart())) return true;
    const withoutQuote = trimmed.startsWith(">") ? trimmed.slice(1).trimStart() : trimmed;
    return GENERATED_MARKER_PATTERN.test(withoutQuote);
  });
}

function normalizeText(content) {
  return Buffer.isBuffer(content) ? content.toString("utf8").replaceAll("\r\n", "\n") : String(content).replaceAll("\r\n", "\n");
}

function removeInlineHtmlTags(title) {
  let result = "";
  let cursor = 0;
  while (cursor < title.length) {
    const open = title.indexOf("<", cursor);
    if (open === -1) return result + title.slice(cursor);
    const close = title.indexOf(">", open + 1);
    if (close === -1) return result + title.slice(cursor);
    result += title.slice(cursor, open);
    cursor = close + 1;
  }
  return result;
}

function stripHeadingMarkup(title) {
  const withoutClosingHashes = title.replace(/[ \t]+#+[ \t]*$/, "");
  return removeInlineHtmlTags(withoutClosingHashes).replace(/[`*_~]/g, "").trim();
}

function slugifyHeading(title) {
  return stripHeadingMarkup(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function addHeading(headings, line, depth, title) {
  const cleanTitle = stripHeadingMarkup(title);
  headings.push({ line, depth, title: cleanTitle, slug: slugifyHeading(cleanTitle) });
}

function readFence(line) {
  const match = line.match(FENCE_PATTERN);
  return match ? { marker: match[1][0], length: match[1].length, suffix: line.slice(match[0].length) } : null;
}

function updateFence(fence, line) {
  const candidate = readFence(line);
  if (!candidate) return { fence, isFence: false };
  if (!fence) return { fence: candidate, isFence: true };
  if (
    candidate.marker === fence.marker
    && candidate.length >= fence.length
    && /^[ \t]*$/.test(candidate.suffix)
  ) return { fence: null, isFence: true };
  return { fence, isFence: true };
}

function inlineCodeRanges(line) {
  const ranges = [];
  for (let index = 0; index < line.length;) {
    if (line[index] !== "`") {
      index += 1;
      continue;
    }
    const start = index;
    while (index < line.length && line[index] === "`") index += 1;
    const length = index - start;
    let close = index;
    let matched = false;
    while (close < line.length) {
      const candidate = line.indexOf("`", close);
      if (candidate < 0) break;
      let end = candidate;
      while (end < line.length && line[end] === "`") end += 1;
      if (end - candidate === length) {
        ranges.push([start, end]);
        index = end;
        matched = true;
        break;
      }
      close = end;
    }
    if (!matched) index = start + length;
  }
  return ranges;
}

function isInsideInlineCode(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function parseMarkdownStructure(text) {
  const lines = text.split("\n");
  const headings = [];
  const explicitAnchors = new Set();
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceState = updateFence(fence, line);
    if (fenceState.isFence) {
      fence = fenceState.fence;
      continue;
    }
    if (fence) continue;
    const inlineRanges = inlineCodeRanges(line);
    for (const match of line.matchAll(ANCHOR_ID_PATTERN)) {
      if (!isInsideInlineCode(inlineRanges, match.index ?? -1)) explicitAnchors.add(match[1]);
    }
    const atx = line.match(ATX_HEADING_PATTERN);
    if (atx) {
      addHeading(headings, index + 1, atx[1].length, atx[2]);
      continue;
    }
    if (!line.trim() || !lines[index + 1] || !SETEXT_HEADING_PATTERN.test(lines[index + 1])) continue;
    addHeading(headings, index + 1, lines[index + 1].trim().startsWith("=") ? 1 : 2, line.trim());
    index += 1;
  }

  const sections = headings.map((heading, index) => {
    const endLine = (headings[index + 1]?.line ?? lines.length + 1) - 1;
    return {
      title: heading.title,
      depth: heading.depth,
      startLine: heading.line,
      endLine,
      lines: endLine - heading.line + 1,
    };
  });
  const largestSection = sections.reduce((largest, section) => (
    !largest || section.lines > largest.lines || section.lines === largest.lines && section.startLine < largest.startLine ? section : largest
  ), null);
  const headingSlugs = new Set();
  for (const heading of headings) {
    const base = heading.slug;
    if (!base) continue;
    let slug = base;
    let suffix = 1;
    while (headingSlugs.has(slug)) slug = `${base}-${suffix++}`;
    headingSlugs.add(slug);
  }
  return { lines, headings, sections, largestSection, headingSlugs, explicitAnchors };
}

function documentLifecycle(file, lines) {
  const normalized = normalizePath(file);
  const metadata = lines.slice(0, 32).filter((line) => /(?:statut|état|type|status|lifecycle|generated)/i.test(line));
  const statuses = new Set();
  for (const line of metadata) {
    for (const status of LIFECYCLE_STATUSES) {
      if (new RegExp(`\\b${status}\\b`, "i").test(line)) statuses.add(status);
    }
  }
  if (statuses.size === 0 && /(?:^|\/)architecture\/adr(?:\/|$)/i.test(normalized)) statuses.add("ADR");
  if (statuses.size === 0 && /(?:^|\/)sessions\/history(?:\/|$)/i.test(normalized)) statuses.add("HISTORY");
  if (statuses.size === 0 && hasGeneratedMarker(lines)) statuses.add("GENERATED");
  return {
    statuses: LIFECYCLE_STATUSES.filter((status) => statuses.has(status)),
    source: statuses.size > 0
      ? /(?:^|\/)architecture\/adr(?:\/|$)|(?:^|\/)sessions\/history(?:\/|$)/i.test(normalized) && metadata.length === 0 ? "CANONICAL_PATH" : "EXPLICIT_MARKER"
      : "NOT_STATED",
  };
}

function documentDomain(file) {
  const parts = normalizePath(file).split("/");
  if (parts[0] === "documentation" && parts[1]) return `documentation:${parts[1]}`;
  if (parts[0] === "apps" && parts[1]) return `apps:${parts[1]}`;
  return parts[0] || "root";
}

function decodePath(value) {
  try { return decodeURIComponent(value); } catch { return null; }
}

function linkPath(target) {
  const hashIndex = target.indexOf("#");
  const beforeFragment = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const queryIndex = beforeFragment.indexOf("?");
  return queryIndex >= 0 ? beforeFragment.slice(0, queryIndex) : beforeFragment;
}

function isInternalLink(target, file, files) {
  if (target.startsWith("#")) return true;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target) || /^www\./i.test(target)) return false;
  const rawPath = linkPath(target);
  const decodedPath = decodePath(rawPath);
  if (decodedPath === null) return true;
  const relativeCandidate = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(file), decodedPath)));
  const rootCandidate = normalizePath(decodedPath.replace(/^\//, ""));
  if (files.has(relativeCandidate) || files.has(rootCandidate)) return true;
  if (LOCAL_LINK_EXTENSIONS.has(path.posix.extname(decodedPath).toLowerCase())) return true;
  return !EXTERNAL_HOST_PATTERN.test(target);
}

function decodeFragment(fragment) {
  return decodePath(fragment);
}

function buildDirectoryIndex(files) {
  const directories = new Set();
  for (const file of files) {
    let slash = file.indexOf("/");
    while (slash >= 0) {
      directories.add(file.slice(0, slash));
      slash = file.indexOf("/", slash + 1);
    }
  }
  return directories;
}

function resolveDocumentTarget(file, target, files, directories) {
  const hashIndex = target.indexOf("#");
  const beforeFragment = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const rawFragment = hashIndex >= 0 ? target.slice(hashIndex + 1) : null;
  const queryIndex = beforeFragment.indexOf("?");
  const rawPath = queryIndex >= 0 ? beforeFragment.slice(0, queryIndex) : beforeFragment;
  const decodedPath = decodePath(rawPath);
  const fragment = rawFragment === null ? null : decodeFragment(rawFragment);
  if (decodedPath === null || rawFragment !== null && fragment === null) return { targetFile: null, fragment: null, exists: false, verifiable: false, reason: "UNVERIFIED_REFERENCE" };
  const candidate = rawPath
    ? rawPath.startsWith("/") ? normalizePath(path.posix.normalize(decodedPath.slice(1))) : normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(file), decodedPath)))
    : normalizePath(file);
  const existsAsFile = (candidate) => files.has(candidate);
  const existsAsDirectory = (candidate) => directories.has(candidate);
  const targetFile = candidate;
  const exists = existsAsFile(targetFile) || existsAsDirectory(targetFile);
  const verifiable = exists || Boolean(path.posix.extname(decodedPath)) || !rawPath;
  return { targetFile, fragment, exists, verifiable };
}

function isHorizontalWhitespace(character) {
  return character === " " || character === "\t";
}

function scanMarkdownUntil(line, start, delimiter) {
  let position = start;
  while (position < line.length) {
    if (line[position] === delimiter) return { position, recoverAt: -1 };
    if (line[position] === "[") {
      let labelEnd = position + 1;
      while (
        labelEnd < line.length
        && line[labelEnd] !== "]"
        && line[labelEnd] !== delimiter
      ) labelEnd += 1;
      if (labelEnd < line.length && line[labelEnd] === "]" && line[labelEnd + 1] === "(") {
        return { position: line.length, recoverAt: position };
      }
      position = labelEnd;
      continue;
    }
    position += 1;
  }
  return { position: line.length, recoverAt: -1 };
}

function findMarkdownLinks(line) {
  const matches = [];
  let cursor = 0;
  while (cursor < line.length) {
    const openBracket = line.indexOf("[", cursor);
    if (openBracket < 0) break;
    const labelScan = scanMarkdownUntil(line, openBracket + 1, "]");
    if (labelScan.recoverAt >= 0) {
      cursor = labelScan.recoverAt;
      continue;
    }
    const labelEnd = labelScan.position;
    if (labelEnd >= line.length || line[labelEnd + 1] !== "(") {
      cursor = labelEnd < line.length ? labelEnd + 1 : line.length;
      continue;
    }
    const fullStart = openBracket > 0 && line[openBracket - 1] === "!" ? openBracket - 1 : openBracket;
    let position = labelEnd + 2;
    while (position < line.length && isHorizontalWhitespace(line[position])) position += 1;
    let target = "";
    if (line[position] === "<") {
      const targetStart = position + 1;
      const targetScan = scanMarkdownUntil(line, targetStart, ">");
      if (targetScan.recoverAt >= 0) {
        cursor = targetScan.recoverAt;
        continue;
      }
      position = targetScan.position;
      if (position >= line.length || position === targetStart) break;
      target = line.slice(targetStart, position);
      position += 1;
    } else {
      const targetStart = position;
      while (position < line.length && line[position] !== ")" && !isHorizontalWhitespace(line[position])) position += 1;
      if (position === targetStart) {
        cursor = labelEnd + 1;
        continue;
      }
      target = line.slice(targetStart, position);
    }
    const closingScan = scanMarkdownUntil(line, position, ")");
    if (closingScan.recoverAt >= 0) {
      cursor = closingScan.recoverAt;
      continue;
    }
    position = closingScan.position;
    if (position >= line.length) {
      break;
    }
    matches.push({ index: fullStart, text: line.slice(openBracket + 1, labelEnd), target });
    cursor = position + 1;
  }
  return matches;
}

function inspectLinks(file, lines, files, headingsByFile) {
  const links = [];
  const invalid = [];
  const unverified = [];
  const directories = buildDirectoryIndex(files);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceState = updateFence(fence, line);
    if (fenceState.isFence) {
      fence = fenceState.fence;
      continue;
    }
    if (fence) continue;
    const inlineRanges = inlineCodeRanges(line);
    for (const match of findMarkdownLinks(line)) {
      const rawTarget = match.target;
      if (isInsideInlineCode(inlineRanges, match.index ?? -1) || !isInternalLink(rawTarget, file, files)) continue;
      const link = { text: match.text, target: rawTarget, line: index + 1 };
      links.push(link);
      const resolved = resolveDocumentTarget(file, rawTarget, files, directories);
      if (!resolved.verifiable) {
        unverified.push({ ...link, reason: resolved.reason ?? "UNVERIFIED_REFERENCE" });
        continue;
      }
      if (!resolved.exists && resolved.verifiable) {
        invalid.push({ ...link, reason: "TARGET_NOT_FOUND", resolvedPath: resolved.targetFile });
        continue;
      }
      if (!resolved.exists || !resolved.fragment) continue;
      const targetStructure = headingsByFile.get(resolved.targetFile);
      if (!targetStructure) continue;
      const anchor = targetStructure?.headingSlugs.has(slugifyHeading(resolved.fragment)) || targetStructure?.explicitAnchors.has(resolved.fragment);
      if (!anchor) invalid.push({ ...link, reason: "ANCHOR_NOT_FOUND", resolvedPath: resolved.targetFile });
    }
  }
  return { links, invalid, unverified };
}

function levelFor(lines) {
  if (lines >= DOCUMENTATION_THRESHOLDS.architectureReview) return "ARCHITECTURE_REVIEW";
  if (lines >= DOCUMENTATION_THRESHOLDS.reviewRequired) return "REVIEW_REQUIRED";
  if (lines >= DOCUMENTATION_THRESHOLDS.surveillance) return "SURVEILLANCE";
  return "NONE";
}

function analyzeDocument(file, content, files, headingsByFile) {
  const text = normalizeText(content);
  const structure = parseMarkdownStructure(text);
  const measurements = measureContent(text);
  const links = inspectLinks(file, structure.lines, files, headingsByFile);
  return {
    path: normalizePath(file),
    domain: documentDomain(file),
    lifecycle: documentLifecycle(file, structure.lines),
    lines: measurements.lines,
    bytes: measurements.bytes,
    headingCount: structure.headings.length,
    maxHeadingDepth: structure.headings.reduce((max, heading) => Math.max(max, heading.depth), 0),
    sections: structure.sections,
    largestSection: structure.largestSection,
    internalLinks: {
      count: links.links.length,
      items: links.links,
      invalid: links.invalid,
      unverified: links.unverified,
    },
    level: levelFor(measurements.lines),
  };
}

export function buildDocumentationNotMeasured({ auditedHead = null, runId = null, error = null, reason = error ? "MEASUREMENT_FAILED" : "HISTORICAL_ABSENCE" } = {}) {
  return {
    schemaVersion: DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION,
    kind: "documentation-maintainability",
    status: "NOT_MEASURED",
    attentionRequired: false,
    auditedHead,
    runId,
    provenance: "NOT_MEASURED",
    reason,
    error: error ? { name: error.name, message: error.message, code: error.code ?? null } : null,
    thresholds: DOCUMENTATION_THRESHOLDS,
    documents: [],
    ranking: [],
    summary: { trackedDocuments: 0, surveillance: 0, reviewRequired: 0, architectureReview: 0, invalidReferences: 0, unverifiedReferences: 0 },
  };
}

export function buildDocumentationMaintainabilityReport({ root = process.cwd(), auditedSha, runId = null, repositoryViewFactory = createRepositoryView } = {}) {
  if (!auditedSha) throw new Error("SHA requis pour l'audit de maintenabilité documentaire.");
  const view = repositoryViewFactory({ root, ref: auditedSha });
  const trackedFiles = new Set(view.listFiles().map(normalizePath));
  const files = new Set([...trackedFiles].filter(isDocumentationFile));
  const contents = new Map([...files].map((file) => [file, view.readBinary(file)]));
  const headingsByFile = new Map([...contents].map(([file, content]) => [file, parseMarkdownStructure(normalizeText(content))]));
  const documents = [...files].sort((left, right) => left.localeCompare(right)).map((file) => analyzeDocument(file, contents.get(file), trackedFiles, headingsByFile));
  const ranking = [...documents].sort((left, right) => right.lines - left.lines || right.bytes - left.bytes || left.path.localeCompare(right.path));
  const summary = {
    trackedDocuments: documents.length,
    surveillance: documents.filter((document) => document.level === "SURVEILLANCE").length,
    reviewRequired: documents.filter((document) => document.level === "REVIEW_REQUIRED").length,
    architectureReview: documents.filter((document) => document.level === "ARCHITECTURE_REVIEW").length,
    invalidReferences: documents.reduce((sum, document) => sum + document.internalLinks.invalid.length, 0),
    unverifiedReferences: documents.reduce((sum, document) => sum + document.internalLinks.unverified.length, 0),
  };
  return {
    schemaVersion: DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION,
    kind: "documentation-maintainability",
    status: "PASS",
    attentionRequired: summary.reviewRequired > 0 || summary.architectureReview > 0 || summary.invalidReferences > 0,
    auditedHead: auditedSha,
    runId,
    provenance: "COMMITTED_SNAPSHOT",
    thresholds: DOCUMENTATION_THRESHOLDS,
    documents,
    ranking,
    summary,
  };
}

export function validateDocumentationReport(report, { auditedSha, runId } = {}) {
  if (report === null || report === undefined) return null;
  if (report.schemaVersion !== DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION || report.kind !== "documentation-maintainability") {
    throw new Error("Rapport documentation-maintainability absent ou schemaVersion invalide.");
  }
  if (report.auditedHead !== auditedSha || report.runId !== runId) throw new Error("Rapport documentation-maintainability incohérent: identité.");
  if (!["PASS", "NOT_MEASURED"].includes(report.status) || !Array.isArray(report.documents) || !Array.isArray(report.ranking)) {
    throw new Error("Rapport documentation-maintainability incomplet.");
  }
  return report;
}
