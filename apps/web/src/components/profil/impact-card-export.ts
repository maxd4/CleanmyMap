import { toPng } from "html-to-image";

const IMPACT_CARD_ELEMENT_ID = "impact-card";
const IMPACT_CARD_BACKGROUND = "#450a0a";
const IMPACT_CARD_FALLBACK_NAME = "Contributeur";

const IMPACT_SHARE_TITLE = "Ma carte d’impact CleanMyMap";
const IMPACT_SHARE_TEXT = "Voici ma carte d’impact CleanMyMap.";

type ImpactShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

export type ImpactCardPng = {
  dataUrl: string;
  blob: Blob;
  file: File;
  filename: string;
};

function normalizeFilenamePart(name: string | undefined): string {
  const normalized = (name ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || IMPACT_CARD_FALLBACK_NAME;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Le PNG de la carte est invalide.");
  }

  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? "image/png";

  if (!metadata.startsWith("data:image/png")) {
    throw new Error("La carte n’a pas été générée au format PNG.");
  }

  if (!metadata.includes(";base64")) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  }

  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function getImpactCardElement(): HTMLElement {
  const card = document.getElementById(IMPACT_CARD_ELEMENT_ID);
  if (!card || typeof HTMLElement === "undefined" || !(card instanceof HTMLElement)) {
    throw new Error("La carte d’impact est introuvable.");
  }

  return card;
}

function getShareNavigator(): ImpactShareNavigator | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator as ImpactShareNavigator;
}

export async function generateImpactCardPng(
  displayName?: string,
): Promise<ImpactCardPng> {
  const dataUrl = await toPng(getImpactCardElement(), {
    cacheBust: true,
    backgroundColor: IMPACT_CARD_BACKGROUND,
  });
  const blob = dataUrlToBlob(dataUrl);
  const filename = `CleanMyMap-Impact-${normalizeFilenamePart(displayName)}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  return { dataUrl, blob, file, filename };
}

export function downloadImpactCardPng(png: ImpactCardPng): void {
  const url = URL.createObjectURL(png.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = png.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function canShareImpactCardFile(file: File): boolean {
  const shareNavigator = getShareNavigator();
  if (
    !shareNavigator ||
    typeof shareNavigator.share !== "function" ||
    typeof shareNavigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    return shareNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareImpactCardFile(file: File): Promise<void> {
  const shareNavigator = getShareNavigator();
  if (!shareNavigator?.share) {
    throw new Error("Le partage de fichier n’est pas disponible.");
  }

  await shareNavigator.share({
    title: IMPACT_SHARE_TITLE,
    text: IMPACT_SHARE_TEXT,
    files: [file],
  });
}

export async function shareOrDownloadImpactCardPng(
  png: ImpactCardPng,
): Promise<"shared" | "downloaded"> {
  if (canShareImpactCardFile(png.file)) {
    await shareImpactCardFile(png.file);
    return "shared";
  }

  downloadImpactCardPng(png);
  return "downloaded";
}

export function isImpactShareAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
