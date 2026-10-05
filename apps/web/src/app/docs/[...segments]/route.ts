import path from "node:path";
import { NextResponse } from "next/server";
import { findPublicDocumentationByDocsPath } from "@/lib/documentation/public-documentation-registry";
import { markDocumentationNoindex } from "./route-seo";
import { buildResponseForFile } from "./route-document";

export const runtime = "nodejs";
const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

function resolveDocumentationPath(canonicalPath: string) {
  const resolved = path.resolve(DOCUMENTATION_ROOT, canonicalPath);
  const relative = path.relative(DOCUMENTATION_ROOT, resolved);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await context.params;
  const entry = findPublicDocumentationByDocsPath(segments.join("/"));

  if (!entry) {
    return NextResponse.json(
      { status: "error", error: "Document introuvable." },
      { status: 404 },
    );
  }

  const resolvedPath = resolveDocumentationPath(entry.canonicalPath);

  if (!resolvedPath) {
    return NextResponse.json({ status: "error", error: "Document invalide." }, { status: 400 });
  }

  try {
    return markDocumentationNoindex(
      await buildResponseForFile(resolvedPath, entry.filename, DOCUMENTATION_ROOT),
    );
  } catch {
    return NextResponse.json(
      { status: "error", error: "Document introuvable." },
      { status: 404 },
    );
  }
}
