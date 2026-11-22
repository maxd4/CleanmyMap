#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRepositoryView } from "../checks/repository-view.mjs";
import { measureContent } from "../checks/top-heavy-measurement.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";
import {
  discoverCriticalContractInventory,
  isSourceFileForContractReview,
  reviewCriticalContracts,
  summarizeCriticalContractReviews,
} from "./documentation-contract-review.mjs";

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

function declaredStatuses(value) {
  const statuses = [];
  let remaining = String(value ?? "").trim().replace(/^[`*]+|[`*]+$/g, "").trim();
  const statusPattern = /^(CURRENT|PLAN|AUDIT|HISTORY|SNAPSHOT|ADR|GENERATED)(?![\w-])/i;
  while (remaining) {
    const match = remaining.match(statusPattern);
    if (!match) break;
    statuses.push(match[1].toUpperCase());
    remaining = remaining.slice(match[0].length).replace(/^[`*]+/, "").trimStart();
    const separator = remaining.match(/^(?:\/|,|;|\band\b|\bet\b)\s*/i);
    if (!separator) break;
    remaining = remaining.slice(separator[0].length).replace(/^[`*]+/, "").trimStart();
  }
  return statuses;
}

function explicitLifecycleDeclarations(lines) {
  const statuses = new Set();
  let fence = null;
  let inFrontmatter = lines[0]?.trim() === "---";
  for (let index = 0; index < Math.min(lines.length, 32); index += 1) {
    const line = lines[index];
    const fenceState = updateFence(fence, line);
    if (fenceState.isFence) {
      fence = fenceState.fence;
      continue;
    }
    if (fence) continue;
    if (inFrontmatter) {
      if (index > 0 && line.trim() === "---") {
        inFrontmatter = false;
        continue;
      }
      const field = line.match(/^\s*(?:status|lifecycle|statut(?:_documentaire)?|état(?:_documentaire)?)\s*:\s*(.+?)\s*$/i);
      if (field) for (const status of declaredStatuses(field[1])) statuses.add(status);
      continue;
    }
    const declaration = line.match(/(?:^|[>\s*])(?:statut(?:\s+documentaire)?|état(?:\s+documentaire)?|status|lifecycle)\s*[:=—–-]\s*(.+?)\s*$/i);
    if (!declaration) continue;
    for (const status of declaredStatuses(declaration[1])) statuses.add(status);
  }
  return statuses;
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
  const statuses = explicitLifecycleDeclarations(lines);
  if (statuses.size === 0 && /(?:^|\/)architecture\/adr(?:\/|$)/i.test(normalized)) statuses.add("ADR");
  if (statuses.size === 0 && /(?:^|\/)sessions\/history(?:\/|$)/i.test(normalized)) statuses.add("HISTORY");
  if (statuses.size === 0 && hasGeneratedMarker(lines)) statuses.add("GENERATED");
  return {
    statuses: LIFECYCLE_STATUSES.filter((status) => statuses.has(status)),
    source: statuses.size > 0
      ? /(?:^|\/)architecture\/adr(?:\/|$)|(?:^|\/)sessions\/history(?:\/|$)/i.test(normalized) && explicitLifecycleDeclarations(lines).size === 0 ? "CANONICAL_PATH" : "EXPLICIT_MARKER"
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

function buildApplicationRouteIndex(files) {
  const routes = new Set();
  for (const file of files) {
    const match = file.match(/^apps\/web\/src\/app\/(.*?)(?:\/)?(?:page|route)\.(?:js|jsx|ts|tsx)$/i);
    if (!match) continue;
    const segments = match[1].split("/").filter((segment) => !/^\([^/]+\)$/.test(segment));
    const route = segments.map((segment) => segment
      .replace(/^\[\.\.\.(.+)\]$/, ":$1*")
      .replace(/^\[\[\.\.\.(.+)\]\]$/, ":$1*")
      .replace(/^\[(.+)\]$/, ":$1"))
      .join("/");
    routes.add(`/${route}`.replace(/\/$/, "") || "/");
  }
  return [...routes].map((route) => {
    const pattern = route.split("/").map((segment) => segment.startsWith(":")
      ? segment.endsWith("*") ? ".*" : "[^/]+"
      : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/");
    return new RegExp(`^${pattern}/?$`);
  });
}

function matchesApplicationRoute(pathname, routes) {
  const normalized = `/${pathname.split("/").filter(Boolean).join("/")}` || "/";
  return routes.some((route) => route.test(normalized));
}

function resolveDocumentTarget(file, target, files, directories, applicationRoutes) {
  const hashIndex = target.indexOf("#");
  const beforeFragment = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const rawFragment = hashIndex >= 0 ? target.slice(hashIndex + 1) : null;
  const queryIndex = beforeFragment.indexOf("?");
  const rawPath = queryIndex >= 0 ? beforeFragment.slice(0, queryIndex) : beforeFragment;
  const decodedPath = decodePath(rawPath);
  const fragment = rawFragment === null ? null : decodeFragment(rawFragment);
  if (decodedPath === null || rawFragment !== null && fragment === null) return { targetFile: null, fragment: null, exists: false, verifiable: false, targetKind: "UNVERIFIABLE_REFERENCE", reason: "UNVERIFIED_REFERENCE" };
  if (rawPath.startsWith("/") && matchesApplicationRoute(decodedPath, applicationRoutes)) {
    return { targetFile: decodedPath, fragment, exists: true, verifiable: true, targetKind: "APPLICATION_ROUTE" };
  }
  const candidate = rawPath
    ? rawPath.startsWith("/") ? normalizePath(path.posix.normalize(decodedPath.slice(1))) : normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(file), decodedPath)))
    : normalizePath(file);
  const normalizedCandidate = candidate.replace(/\/$/, "");
  const existsAsFile = (candidate) => files.has(candidate);
  const existsAsDirectory = (candidate) => directories.has(candidate);
  const targetFile = normalizedCandidate;
  const existsAsFileValue = existsAsFile(targetFile);
  const existsAsDirectoryValue = existsAsDirectory(targetFile);
  const exists = existsAsFileValue || existsAsDirectoryValue;
  const verifiable = exists || Boolean(path.posix.extname(decodedPath)) || !rawPath;
  return {
    targetFile,
    fragment,
    exists,
    verifiable,
    targetKind: existsAsFileValue ? "FILE" : existsAsDirectoryValue ? "DIRECTORY" : verifiable ? "FILE_MISSING" : "UNVERIFIABLE_REFERENCE",
  };
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
      let nestedParentheses = 0;
      while (position < line.length && !isHorizontalWhitespace(line[position])) {
        if (line[position] === "\\" && position + 1 < line.length) {
          position += 2;
          continue;
        }
        if (line[position] === "(") nestedParentheses += 1;
        if (line[position] === ")") {
          if (nestedParentheses === 0) break;
          nestedParentheses -= 1;
        }
        position += 1;
      }
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
  const applicationRoutes = buildApplicationRouteIndex(files);
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
      const resolved = resolveDocumentTarget(file, rawTarget, files, directories, applicationRoutes);
      const link = { text: match.text, target: rawTarget, line: index + 1, targetKind: resolved.targetKind };
      links.push(link);
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
    contractReviews: [],
    contractInventory: {
      sqlMigrations: { status: "NOT_MEASURED", reason: "HISTORICAL_ABSENCE", occurrences: [], summary: {} },
      excludedCandidateSources: { status: "NOT_MEASURED", reason: "HISTORICAL_ABSENCE", items: [] },
    },
    summary: {
      trackedDocuments: 0,
      surveillance: 0,
      reviewRequired: 0,
      architectureReview: 0,
      invalidReferences: 0,
      unverifiedReferences: 0,
      criticalContracts: 0,
      documentedContracts: 0,
      reviewRequiredContracts: 0,
      notMeasuredContracts: 0,
      sqlMigrationOccurrences: null,
      sqlMigrationDrops: null,
      sqlSourceCandidates: null,
      sqlDatabasePresence: "NOT_MEASURED",
      excludedNonRuntimeCandidateSources: null,
    },
  };
}

export function buildDocumentationMaintainabilityReport({ root = process.cwd(), auditedSha, runId = null, repositoryViewFactory = createRepositoryView } = {}) {
  if (!auditedSha) throw new Error("SHA requis pour l'audit de maintenabilité documentaire.");
  const view = repositoryViewFactory({ root, ref: auditedSha });
  const trackedFiles = new Set(view.listFiles().map(normalizePath));
  const files = new Set([...trackedFiles].filter(isDocumentationFile));
  const contents = new Map([...files].map((file) => [file, view.readBinary(file)]));
  const headingsByFile = new Map([...contents].map(([file, content]) => [file, parseMarkdownStructure(normalizeText(content))]));
  const documentSources = [...files].sort((left, right) => left.localeCompare(right)).map((file) => ({
    ...analyzeDocument(file, contents.get(file), trackedFiles, headingsByFile),
    content: normalizeText(contents.get(file)),
  }));
  const documents = documentSources.map(({ content, ...document }) => document);
  const sourceContents = new Map([...trackedFiles]
    .filter((file) => isSourceFileForContractReview(file))
    .map((file) => [file, normalizeText(view.readBinary(file))]));
  const contractInventory = discoverCriticalContractInventory({ files: [...sourceContents.keys()], readFile: (file) => sourceContents.get(file) });
  const contractReviews = reviewCriticalContracts({ contracts: contractInventory.contracts, documents: documentSources });
  const ranking = [...documents].sort((left, right) => right.lines - left.lines || right.bytes - left.bytes || left.path.localeCompare(right.path));
  const contractSummary = summarizeCriticalContractReviews(contractReviews);
  const summary = {
    trackedDocuments: documents.length,
    surveillance: documents.filter((document) => document.level === "SURVEILLANCE").length,
    reviewRequired: documents.filter((document) => document.level === "REVIEW_REQUIRED").length,
    architectureReview: documents.filter((document) => document.level === "ARCHITECTURE_REVIEW").length,
    invalidReferences: documents.reduce((sum, document) => sum + document.internalLinks.invalid.length, 0),
    unverifiedReferences: documents.reduce((sum, document) => sum + document.internalLinks.unverified.length, 0),
    ...contractSummary,
    ...contractInventory.summary,
  };
  return {
    schemaVersion: DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION,
    kind: "documentation-maintainability",
    status: "PASS",
    attentionRequired: summary.reviewRequired > 0
      || summary.architectureReview > 0
      || summary.invalidReferences > 0
      || summary.reviewRequiredContracts > 0,
    auditedHead: auditedSha,
    runId,
    provenance: "COMMITTED_SNAPSHOT",
    thresholds: DOCUMENTATION_THRESHOLDS,
    documents,
    ranking,
    contractReviews,
    contractInventory: {
      sqlMigrations: {
        status: "VERSIONED_SOURCE_HISTORY_MEASURED",
        runtimePresence: "NOT_MEASURED",
        runtimeReason: "NO_POSTGRES_CATALOG_EVIDENCE_MATCHING_AUDITED_SHA",
        occurrences: contractInventory.sqlMigrationHistory,
      },
      excludedCandidateSources: {
        status: "MEASURED_EXCLUDED_FROM_RUNTIME_DISCOVERY",
        items: contractInventory.excludedCandidateSources,
      },
    },
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
  if (report.contractReviews !== undefined && !Array.isArray(report.contractReviews)) {
    throw new Error("Rapport documentation-maintainability invalide: contractReviews.");
  }
  for (const field of ["criticalContracts", "documentedContracts", "reviewRequiredContracts", "notMeasuredContracts"]) {
    if (report.summary?.[field] !== undefined && !Number.isInteger(report.summary[field])) {
      throw new Error(`Rapport documentation-maintainability invalide: summary.${field}.`);
    }
  }
  return report;
}

function referenceProvenance(document, referencePath = "") {
  const pathValue = `${document.path} ${referencePath}`.toLowerCase();
  if (/(?:^|[\\/._-])(?:vendor|third-party|third_party)(?:[\\/._-]|$)/.test(pathValue)) return "vendor";
  const statuses = document.lifecycle?.statuses ?? [];
  if (statuses.includes("CURRENT") && statuses.length === 1) return "active";
  if (statuses.some((status) => ["HISTORY", "AUDIT", "SNAPSHOT", "ADR", "GENERATED", "PLAN"].includes(status))) return "historical";
  return "unstated";
}

function documentReferenceRows(documents, key) {
  return documents.flatMap((document) => (document.internalLinks?.[key] ?? []).map((reference) => ({
    ...reference,
    documentPath: document.path,
    provenance: referenceProvenance(document, reference.resolvedPath ?? reference.target ?? ""),
  })));
}

export function formatDocumentationAuditSummary(report, { maxDetails = 6 } = {}) {
  const lines = [
    "Documentation audit — synthèse humaine",
    `SHA: ${report?.auditedHead ?? "NOT_MEASURED"} | scope: documentation | runId: ${report?.runId ?? "NOT_MEASURED"}`,
    `Statut: ${report?.status ?? "NOT_MEASURED"} | attention requise: ${report?.attentionRequired ?? "NOT_MEASURED"} | écriture: aucune`,
  ];
  if (!report || report.status === "NOT_MEASURED") {
    lines.push(`Raison: ${report?.reason ?? "NOT_MEASURED"}`);
    return lines.join("\n");
  }

  const summary = report.summary ?? {};
  lines.push(
    `Documents: ${summary.trackedDocuments ?? "NOT_MEASURED"} | contrats critiques: ${summary.criticalContracts ?? "NOT_MEASURED"} (DOCUMENTED ${summary.documentedContracts ?? "NOT_MEASURED"}, REVIEW_REQUIRED ${summary.reviewRequiredContracts ?? "NOT_MEASURED"}, NOT_MEASURED ${summary.notMeasuredContracts ?? "NOT_MEASURED"})`,
  );
  const contractInventory = report.contractInventory ?? {};
  const sqlMigrations = contractInventory.sqlMigrations ?? {};
  const candidateSources = contractInventory.excludedCandidateSources?.items ?? [];
  lines.push(`Historique SQL versionné: ${summary.sqlMigrationOccurrences ?? "NOT_MEASURED"} définitions, ${summary.sqlMigrationDrops ?? "NOT_MEASURED"} suppressions; ${summary.sqlSourceCandidates ?? "NOT_MEASURED"} dernières signatures source. Présence PostgreSQL: ${sqlMigrations.runtimePresence ?? "NOT_MEASURED"}.`);
  lines.push(`Candidats TS/TSX non intégrés exclus du runtime: ${candidateSources.length} (provenance conservée).`);
  for (const candidate of candidateSources.slice(0, Math.min(3, maxDetails))) {
    lines.push(`- ${candidate.path} — ${candidate.provenance}; ${candidate.reason}.`);
  }

  const longDocuments = (report.documents ?? []).filter((document) => document.level !== "NONE")
    .sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path, "en"));
  const historicalDocuments = (report.documents ?? []).filter((document) => (document.lifecycle?.statuses ?? []).some((status) => ["HISTORY", "AUDIT", "SNAPSHOT", "ADR", "GENERATED", "PLAN"].includes(status)));
  const vendorDocuments = (report.documents ?? []).filter((document) => /(?:^|[\\/._-])(?:vendor|third-party|third_party)(?:[\\/._-]|$)/i.test(document.path));
  lines.push(`Provenance des documents: historiques/PLAN ${historicalDocuments.length} | vendor ${vendorDocuments.length}`);
  lines.push(`Documents longs: ${longDocuments.length} (surveillance ${summary.surveillance ?? "NOT_MEASURED"}, REVIEW_REQUIRED ${summary.reviewRequired ?? "NOT_MEASURED"}, ARCHITECTURE_REVIEW ${summary.architectureReview ?? "NOT_MEASURED"})`);
  for (const document of longDocuments.slice(0, maxDetails)) {
    const section = document.largestSection
      ? `${document.largestSection.title} (L${document.largestSection.startLine}-${document.largestSection.endLine})`
      : "NOT_MEASURED";
    lines.push(`- ${document.path} (${document.lines} lignes, ${document.level}) — preuve: section la plus longue ${section}; raison: volume documentaire; décision attendue: confirmer la lisibilité ou une découpe éditoriale.`);
  }
  if (longDocuments.length > maxDetails) lines.push(`- … ${longDocuments.length - maxDetails} autres documents dans le JSON.`);

  const invalid = documentReferenceRows(report.documents ?? [], "invalid");
  const invalidCounts = Object.fromEntries(["active", "historical", "vendor", "unstated"].map((source) => [source, invalid.filter((reference) => reference.provenance === source).length]));
  const unverified = documentReferenceRows(report.documents ?? [], "unverified");
  const unverifiedCounts = Object.fromEntries(["active", "historical", "vendor", "unstated"].map((source) => [source, unverified.filter((reference) => reference.provenance === source).length]));
  const allReferences = (report.documents ?? []).flatMap((document) => (document.internalLinks?.items ?? []));
  const targetKindCounts = Object.fromEntries(["FILE_MISSING", "DIRECTORY", "APPLICATION_ROUTE", "UNVERIFIABLE_REFERENCE"].map((kind) => [kind, allReferences.filter((reference) => reference.targetKind === kind).length]));
  lines.push(`Liens actifs invalides: ${invalidCounts.active} | historiques: ${invalidCounts.historical} | vendor: ${invalidCounts.vendor} | provenance non établie: ${invalidCounts.unstated} | non vérifiables: ${unverified.length} (vendor ${unverifiedCounts.vendor}, historiques ${unverifiedCounts.historical}, provenance inconnue ${unverifiedCounts.unstated})`);
  lines.push(`Nature des références: fichiers absents ${targetKindCounts.FILE_MISSING} | liens vers dossiers ${targetKindCounts.DIRECTORY} | routes applicatives reconnues ${targetKindCounts.APPLICATION_ROUTE} | cibles non vérifiables ${targetKindCounts.UNVERIFIABLE_REFERENCE}.`);
  for (const reference of invalid.filter((entry) => entry.provenance === "active").slice(0, maxDetails)) {
    lines.push(`- ${reference.documentPath}:L${reference.line} → ${reference.resolvedPath ?? reference.target ?? "cible inconnue"} (${reference.reason}) — corriger ou confirmer la destination CURRENT.`);
  }
  if (invalidCounts.active > maxDetails) lines.push(`- … ${invalidCounts.active - maxDetails} autres liens actifs invalides dans le JSON.`);
  for (const reference of unverified.slice(0, Math.min(3, maxDetails))) {
    lines.push(`- Référence non vérifiable: ${reference.documentPath}:L${reference.line} → ${reference.target ?? "cible inconnue"} (${reference.reason}) — vérifier manuellement la syntaxe/provenance.`);
  }
  if (unverified.length > Math.min(3, maxDetails)) lines.push(`- … ${unverified.length - Math.min(3, maxDetails)} autres références non vérifiables dans le JSON.`);

  const contracts = report.contractReviews ?? [];
  const reviewRequired = contracts.filter((review) => review.status === "REVIEW_REQUIRED");
  const reviewPriority = (review) => {
    if (["AUTHORIZATION", "PRIVILEGED_RPC", "RPC_PUBLIC", "RPC_AUTHENTICATED", "RPC_PRIVILEGE_UNESTABLISHED"].includes(review.kind)) return 0;
    if (review.kind === "SCIENTIFIC_CALCULATION") return 1;
    return 2;
  };
  const prioritizedReviews = [...reviewRequired].sort((left, right) => reviewPriority(left) - reviewPriority(right)
    || left.path.localeCompare(right.path, "en") || String(left.symbol ?? "").localeCompare(String(right.symbol ?? ""), "en"));
  const notMeasuredContracts = contracts.filter((review) => review.status === "NOT_MEASURED");
  const sqlSourceContracts = contracts.filter((review) => review.sourceLifecycle?.kind === "SQL_MIGRATION_CANDIDATE");
  const noCodeTestReferences = contracts.filter((review) => review.evidence?.tests?.code?.status === "NO_CODE_TEST_REFERENCE_FOUND").length;
  const noTestDocumentation = contracts.filter((review) => review.evidence?.tests?.documentation?.status === "NO_TEST_DOCUMENTATION_EVIDENCE").length;
  const contractAttribution = (review) => review.documentsExamined?.flatMap((document) => (document.attributions ?? []).map((entry) => `${document.path}:L${entry.line}`))[0];
  lines.push(`Contrats: ${summary.documentedContracts ?? "NOT_MEASURED"} DOCUMENTED | ${reviewRequired.length} REVIEW_REQUIRED | ${notMeasuredContracts.length} NOT_MEASURED.`);
  lines.push(`Preuves de tests distinctes: ${noCodeTestReferences} contrats sans référence vers un fichier de test dans le code; ${noTestDocumentation} sans preuve de test attribuée dans la documentation. Une référence de code ne prouve pas l'exécution.`);
  lines.push(`Décision attendue: traiter les ${reviewRequired.length} REVIEW_REQUIRED avec attribution et preuve CURRENT.`);
  if (notMeasuredContracts.length > 0) lines.push(`Les ${notMeasuredContracts.length} NOT_MEASURED restent sans conclusion tant qu'une attribution/preuve vérifiable manque.`);
  for (const review of prioritizedReviews.slice(0, maxDetails)) {
    const label = `${review.path}${review.symbol ? `#${review.symbol}` : ""}`;
    lines.push(`- ${label} — raison: ${(review.reasons ?? []).slice(0, 2).join(" / ") || "preuve insuffisante"}; référence: ${contractAttribution(review) ?? "aucune attribution précise"}.`);
  }
  if (prioritizedReviews.length > maxDetails) lines.push(`- … ${prioritizedReviews.length - maxDetails} autres contrats REVIEW_REQUIRED dans le JSON.`);
  for (const review of notMeasuredContracts.slice(0, Math.min(2, maxDetails))) {
    const label = `${review.path}${review.symbol ? `#${review.symbol}` : ""}`;
    lines.push(`- NOT_MEASURED ${label} — ${(review.reasons ?? []).slice(0, 2).join(" / ") || "aucune preuve attribuable"}; référence: ${contractAttribution(review) ?? "aucune attribution précise"}.`);
  }
  for (const review of sqlSourceContracts.slice(0, Math.min(3, maxDetails))) {
    const latest = review.sourceLifecycle.latestDefinition;
    const historyCount = review.sourceLifecycle.history?.length ?? 0;
    lines.push(`Candidat SQL non déclaré actif ${review.evidence.codeSymbol}(${review.sourceLifecycle.signature}) — ${review.databasePresence?.status ?? "NOT_MEASURED"}; dernière définition ${latest.path}:L${latest.line}, ${historyCount} événement(s) de migration versionné(s).`);
  }
  lines.push("Preuves détaillées: documents, liens, attributions et preuves dimensionnelles dans le rapport JSON.");
  return lines.join("\n");
}

function cliValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function currentHead(root) {
  return execFileSync(gitExecutable(), ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

export function runDocumentationMaintainabilityCli(args = process.argv.slice(2)) {
  const root = path.resolve(cliValue(args, "--root", process.cwd()));
  const auditedSha = cliValue(args, "--sha", currentHead(root));
  const runId = cliValue(args, "--run-id", "documentation-maintainability-cli");
  const dryRun = args.includes("--dry-run");
  const report = buildDocumentationMaintainabilityReport({ root, auditedSha, runId });
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`DOCUMENTATION_AUDIT_MODE: ${dryRun ? "DRY_RUN" : "READ_ONLY"}\n`);
    process.stdout.write(`${formatDocumentationAuditSummary(report)}\n`);
  }
  return report;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  try {
    runDocumentationMaintainabilityCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
