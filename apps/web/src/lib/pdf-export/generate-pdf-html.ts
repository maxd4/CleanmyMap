import { MASTER_PACK_CHAPTERS } from "@/lib/reports/master-pack/constants";
import { computeExecutiveNarrative } from "@/lib/reports/master-pack/analytics/executive";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { buildPdfChapterContent } from "./generate-pdf-html.chapters";
import { buildPdfCover } from "./generate-pdf-html.cover";
import { buildPdfTableOfContents } from "./generate-pdf-html.toc";
import { buildPdfPrintStyles } from "./generate-pdf-html.templates";

export function collectHeadStyles(): string {
  if (typeof document === "undefined") return "";
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
}

export function generatePdfHtml(
  reportData: ReportModel,
  organizationName: string,
  selectedOrg: string,
  deliverableId: string,
): string {
  const executive = reportData ? computeExecutiveNarrative(reportData) : null;
  const printContainer = document.createElement("div");
  printContainer.className = "master-pack-container";

  const cover = document.createElement("div");
  cover.className = "report-cover";
  cover.innerHTML = buildPdfCover(organizationName, selectedOrg, deliverableId);
  printContainer.appendChild(cover);

  const tocPage = document.createElement("div");
  tocPage.className = "page-break";
  tocPage.style.padding = "60px";
  tocPage.innerHTML = buildPdfTableOfContents();
  printContainer.appendChild(tocPage);

  MASTER_PACK_CHAPTERS.filter((chapter) => chapter.id !== "sommaire").forEach((chapter) => {
    const page = document.createElement("div");
    page.className = "page-break";
    page.id = `chapter-${chapter.id}`;
    page.style.padding = "60px";
    page.innerHTML = buildPdfChapterContent(chapter, reportData, executive);
    printContainer.appendChild(page);
  });

  const styles = collectHeadStyles();
  const printStyles = buildPdfPrintStyles();

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Master Pack - ${organizationName}</title>
  ${styles}
  <style>${printStyles}</style>
</head>
<body>
  ${printContainer.outerHTML}
  <script>
    window.addEventListener("afterprint", () => window.close());
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 1000);
    });
  </script>
</body>
</html>`;
}
