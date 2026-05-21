import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DocumentationAsset = {
  filePath: string;
  filename: string;
};

const DOCUMENTATION_ASSETS: Record<string, DocumentationAsset> = {
  "graphique-impact-co2e": {
    filePath: resolve(
      process.cwd(),
      "..",
      "..",
      "documentation",
      "plans",
      "rapport_impact",
      "graphique_impact_CO2e.md",
    ),
    filename: "graphique_impact_CO2e.md",
  },
  atelier_DU: {
    filePath: resolve(process.cwd(), "..", "..", "documentation", "plans", "atelier_DU.md"),
    filename: "atelier_DU.md",
  },
  journal_DU: {
    filePath: resolve(process.cwd(), "..", "..", "documentation", "plans", "journal_DU.md"),
    filename: "journal_DU.md",
  },
  journal_impact_DU: {
    filePath: resolve(
      process.cwd(),
      "..",
      "..",
      "documentation",
      "plans",
      "journal_impact_DU.md",
    ),
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

  try {
    const content = await readFile(asset.filePath, "utf8");

    return new Response(content, {
      status: 200,
      headers: buildDownloadHeaders(asset.filename),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de charger le document.",
        details: message,
      },
      { status: 503 },
    );
  }
}
