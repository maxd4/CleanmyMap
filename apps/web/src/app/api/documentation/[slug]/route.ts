import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { findPublicDocumentationByApiSlug } from "@/lib/documentation/public-documentation-registry";

export const runtime = "nodejs";

const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

function buildDownloadHeaders(filename: string) {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "public, max-age=0, must-revalidate, s-maxage=86400, stale-while-revalidate=604800",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const asset = findPublicDocumentationByApiSlug(slug);

  if (!asset) {
    return NextResponse.json(
      {
        status: "error",
        error: "Document introuvable.",
      },
      { status: 404 },
    );
  }

  const resolvedPath = path.resolve(DOCUMENTATION_ROOT, asset.canonicalPath);
  const relative = path.relative(DOCUMENTATION_ROOT, resolvedPath);

  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return NextResponse.json(
      {
        status: "error",
        error: "Document invalide.",
      },
      { status: 400 },
    );
  }

  try {
    const content = await readFile(resolvedPath, "utf8");

    return new Response(content, {
      status: 200,
      headers: buildDownloadHeaders(asset.filename),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de charger le document.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}
