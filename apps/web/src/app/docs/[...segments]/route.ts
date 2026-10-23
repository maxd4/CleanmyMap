import { NextResponse } from "next/server";
import { findPublicDocumentationByDocsPath } from "@/lib/documentation/public-documentation-registry";
import { markDocumentationNoindex } from "./route-seo";
import { buildResponseForFile } from "./route-document";
import { DOCUMENTATION_ROOT, resolveDocumentationPath } from "./route-path";

export const runtime = "nodejs";

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
