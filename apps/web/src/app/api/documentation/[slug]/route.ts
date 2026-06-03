import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DocumentationAsset = {
  filePath: string;
  filename: string;
};

const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

const DOCUMENTATION_ASSETS: Record<string, DocumentationAsset> = {
  "graphique-impact-co2e": {
    filePath: path.join("plans", "rapport_impact", "graphique_impact_CO2e.md"),
    filename: "graphique_impact_CO2e.md",
  },
  atelier_DU: {
    filePath: path.join("plans", "ateliers_DU.md"),
    filename: "atelier_DU.md",
  },
  journal_DU: {
    filePath: path.join("plans", "journal_DU.md"),
    filename: "journal_DU.md",
  },
  journal_impact_DU: {
    filePath: path.join("plans", "journal_impact_DU.md"),
    filename: "journal_impact_DU.md",
  },
};

function buildDownloadHeaders(filename: string) {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const asset = DOCUMENTATION_ASSETS[slug];

  if (!asset) {
    return NextResponse.json(
      {
        status: "error",
        error: "Document introuvable.",
      },
      { status: 404 },
    );
  }

  const resolvedPath = path.resolve(DOCUMENTATION_ROOT, asset.filePath);

  if (!resolvedPath.startsWith(DOCUMENTATION_ROOT)) {
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

