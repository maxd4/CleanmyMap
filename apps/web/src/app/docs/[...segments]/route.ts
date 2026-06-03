import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

function resolveDocumentationPath(segments: string[]) {
  const resolved = path.resolve(DOCUMENTATION_ROOT, ...segments);
  if (!resolved.startsWith(DOCUMENTATION_ROOT)) {
    return null;
  }
  return resolved;
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await context.params;
  const resolvedPath = resolveDocumentationPath(segments);

  if (!resolvedPath) {
    return NextResponse.json({ status: "error", error: "Document invalide." }, { status: 400 });
  }

  try {
    const content = await readFile(resolvedPath);
    const filename = segments.at(-1) ?? "document";

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": getContentType(resolvedPath),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { status: "error", error: "Document introuvable." },
      { status: 404 },
    );
  }
}

