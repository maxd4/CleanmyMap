import { triggerBrowserDownload } from "@/components/reports/admin-workflow/services";

type ShareCapableNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

function getFilename(contentDisposition: string | null, fallback: string): string {
  const utf8 = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      return fallback;
    }
  }
  return contentDisposition?.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}

function canShareFile(file: File): boolean {
  const shareNavigator = navigator as ShareCapableNavigator;
  if (typeof shareNavigator.share !== "function" || typeof shareNavigator.canShare !== "function") return false;
  try {
    return shareNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function downloadOrShareReportPdf(params: {
  generationId: string;
  theme: "impact" | "scientific";
}): Promise<"shared" | "downloaded"> {
  const url = `/api/reports/generations/${encodeURIComponent(params.generationId)}/pdf?theme=${params.theme}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : "Le PDF est indisponible pour le moment.");
  }
  if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("application/pdf")) {
    throw new Error("La réponse du téléchargement n’est pas un fichier PDF.");
  }
  const blob = await response.blob();
  const filename = getFilename(response.headers.get("Content-Disposition"), "rapport_cleanmymap.pdf");
  const file = new File([blob], filename, { type: "application/pdf" });
  if (canShareFile(file)) {
    await (navigator as ShareCapableNavigator).share?.({
      title: "Rapport CleanMyMap",
      text: "Rapport PDF CleanMyMap",
      files: [file],
    });
    return "shared";
  }
  triggerBrowserDownload(blob, filename);
  return "downloaded";
}
