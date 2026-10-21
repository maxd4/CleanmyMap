#!/usr/bin/env node

import path from "node:path";

import { createRepositoryView } from "../checks/repository-view.mjs";
import { measureContent } from "../checks/top-heavy-measurement.mjs";

export const DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION = 1;
export const DOCUMENTATION_EXTENSIONS = Object.freeze([".md", ".mdx"]);
export const DOCUMENTATION_THRESHOLDS = Object.freeze({
  surveillance: 601,
  reviewRequired: 1_001,
  architectureReview: 1_501,
});

const LIFECYCLE_STATUSES = Object.freeze(["CURRENT", "PLAN", "AUDIT", "HISTORY", "SNAPSHOT", "ADR", "GENERATED"]);
const LIFECYCLE_STATUS_SET = new Set(LIFECYCLE_STATUSES);
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;
const ATX_HEADING_PATTERN = /^\s{0,3}(#{1,6})(?:\s+|$)(.*?)\s*$/;
const SETEXT_HEADING_PATTERN = /^\s{0,3}(=+|-+)\s*$/;
const LINK_PATTERN = /!?(\[([^\]]*)\])\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g;
const ANCHOR_ID_PATTERN = /\b(?:id|name)=["']([^"']+)["']/gi;

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function isDocumentationFile(file) {
  return DOCUMENTATION_EXTENSIONS.includes(path.posix.extname(file).toLowerCase());
}

function normalizeText(content) {
  return Buffer.isBuffer(content) ? content.toString("utf8").replaceAll("\r\n", "\n") : String(content).replaceAll("\r\n", "\n");
}

function stripHeadingMarkup(title) {
  return title
    .replace(/\s+#+\s*$/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .trim();
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

function parseMarkdownStructure(text) {
  const lines = text.split("\n");
  const headings = [];
  const explicitAnchors = new Set();
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;
    for (const match of line.matchAll(ANCHOR_ID_PATTERN)) explicitAnchors.add(match[1]);
    const atx = line.match(ATX_HEADING_PATTERN);
    if (atx) {
      addHeading(headings, index + 1, atx[1].length, atx[2]);
      continue;
    }
    if (index === 0 || !line.trim() || !lines[index + 1] || !SETEXT_HEADING_PATTERN.test(lines[index + 1])) continue;
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
  if (statuses.size === 0 && /(?:<!--|^\s*>?\s*)(?:generated|auto-generated|ne pas modifier)/i.test(lines.slice(0, 12).join("\n"))) statuses.add("GENERATED");
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

function isInternalLink(target) {
  return target.startsWith("#")
    || !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)
    && !/^(?:www\.)?[^/#\s]+\.[a-z]{2,}(?:\/|$)/i.test(target);
}

function decodeFragment(fragment) {
  try { return decodeURIComponent(fragment); } catch { return fragment; }
}

function resolveDocumentTarget(file, target, files) {
  const withoutQuery = target.split("?")[0];
  const hashIndex = withoutQuery.indexOf("#");
  const rawPath = hashIndex >= 0 ? withoutQuery.slice(0, hashIndex) : withoutQuery;
  const fragment = hashIndex >= 0 ? decodeFragment(withoutQuery.slice(hashIndex + 1)) : null;
  const candidates = rawPath
    ? [
      rawPath.startsWith("/") ? normalizePath(rawPath.slice(1)) : normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(file), rawPath))),
      normalizePath(rawPath),
    ]
    : [file];
  const existsAsFile = (candidate) => files.has(candidate);
  const existsAsDirectory = (candidate) => [...files].some((entry) => entry.startsWith(`${candidate}/`));
  const targetFile = candidates.find((candidate) => existsAsFile(candidate) || existsAsDirectory(candidate)) ?? candidates[0];
  const exists = existsAsFile(targetFile) || existsAsDirectory(targetFile);
  const verifiable = exists || Boolean(path.posix.extname(rawPath)) || !rawPath;
  return { targetFile, fragment, exists, verifiable };
}

function inspectLinks(file, lines, files, headingsByFile) {
  const links = [];
  const invalid = [];
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;
    for (const match of line.matchAll(LINK_PATTERN)) {
      const rawTarget = match[3].startsWith("<") ? match[3].slice(1, -1) : match[3];
      if (!isInternalLink(rawTarget)) continue;
      const link = { text: match[2], target: rawTarget, line: index + 1 };
      links.push(link);
      const resolved = resolveDocumentTarget(file, rawTarget, files);
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
  return { links, invalid };
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
    },
    level: levelFor(measurements.lines),
  };
}

export function buildDocumentationNotMeasured({ auditedHead = null, runId = null, error = null } = {}) {
  return {
    schemaVersion: DOCUMENTATION_MAINTAINABILITY_SCHEMA_VERSION,
    kind: "documentation-maintainability",
    status: "NOT_MEASURED",
    attentionRequired: false,
    auditedHead,
    runId,
    provenance: "NOT_MEASURED",
    error: error ? { name: error.name, message: error.message, code: error.code ?? null } : null,
    thresholds: DOCUMENTATION_THRESHOLDS,
    documents: [],
    ranking: [],
    summary: { trackedDocuments: 0, surveillance: 0, reviewRequired: 0, architectureReview: 0, invalidReferences: 0 },
  };
}

export function buildDocumentationMaintainabilityReport({ root = process.cwd(), auditedSha, runId = null, repositoryViewFactory = createRepositoryView } = {}) {
  if (!auditedSha) throw new Error("SHA requis pour l'audit de maintenabilité documentaire.");
  const view = repositoryViewFactory({ root, ref: auditedSha });
  const trackedFiles = new Set(view.listFiles().map(normalizePath));
  const files = new Set([...trackedFiles].filter(isDocumentationFile));
  const contents = new Map([...files].map((file) => [file, view.readBinary(file)]));
  const headingsByFile = new Map([...contents].map(([file, content]) => [file, parseMarkdownStructure(normalizeText(content))]));
  const documents = [...files].sort().map((file) => analyzeDocument(file, contents.get(file), trackedFiles, headingsByFile));
  const ranking = [...documents].sort((left, right) => right.lines - left.lines || right.bytes - left.bytes || left.path.localeCompare(right.path));
  const summary = {
    trackedDocuments: documents.length,
    surveillance: documents.filter((document) => document.level === "SURVEILLANCE").length,
    reviewRequired: documents.filter((document) => document.level === "REVIEW_REQUIRED").length,
    architectureReview: documents.filter((document) => document.level === "ARCHITECTURE_REVIEW").length,
    invalidReferences: documents.reduce((sum, document) => sum + document.internalLinks.invalid.length, 0),
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
