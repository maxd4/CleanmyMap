import type {
  ActionPhotoAsset,
  ActionVisionDensity,
  ActionVisionEstimate,
  ActionVisionSource,
} from "@/lib/actions/types";

export type ActionVisionContext = {
  locationLabel: string;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  placeType?: string;
  volunteersCount?: number;
  durationMinutes?: number;
};

export type ActionPhotoAnalysis = {
  brightness: number;
  contrast: number;
  saturation: number;
  darkRatio: number;
  warmRatio: number;
  whiteRatio: number;
  edgeDensity: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function confidenceInterval(value: number, confidence: number, scale: number): [number, number] {
  const spread = scale * (1 - confidence);
  return [round(Math.max(0, value - spread), 2), round(value + spread, 2)];
}

function classifySource(photoCount: number, confidence: number): ActionVisionSource {
  if (photoCount >= 3 && confidence >= 0.82) return "vision";
  if (photoCount >= 1 && confidence >= 0.56) return "hybrid";
  return "heuristic";
}

function estimateConfidence(
  photoCount: number,
  stats: ActionPhotoAnalysis[],
  context: ActionVisionContext,
): number {
  const meanContrast =
    stats.reduce((sum, item) => sum + item.contrast, 0) / Math.max(1, stats.length);
  const meanEdge =
    stats.reduce((sum, item) => sum + item.edgeDensity, 0) / Math.max(1, stats.length);
  const meanCoverage =
    stats.reduce((sum, item) => sum + item.darkRatio, 0) / Math.max(1, stats.length);
  const contextBoost =
    (context.arrivalLocationLabel?.trim().length ?? 0) > 0 ? 0.06 : 0.02;
  const photoBoost = photoCount >= 2 ? 0.12 : photoCount === 1 ? 0.04 : -0.18;
  return clamp(
    0.32 +
      photoBoost +
      contextBoost +
      meanContrast * 0.22 +
      meanEdge * 0.18 +
      meanCoverage * 0.14,
    0.18,
    0.96,
  );
}

function densityFromRatios(
  saturation: number,
  warmRatio: number,
  darkRatio: number,
  whiteRatio: number,
): ActionVisionDensity {
  if (whiteRatio > 0.44 && saturation < 0.2 && darkRatio < 0.24) {
    return "sec";
  }
  if (saturation > 0.32 || darkRatio > 0.34) {
    return "mouille";
  }
  if (warmRatio > 0.18 || saturation > 0.2 || darkRatio > 0.24) {
    return "humide_dense";
  }
  return "sec";
}

function fillLevelFromAnalysis(
  darkRatio: number,
  edgeDensity: number,
  durationMinutes?: number,
): number {
  const raw =
    18 +
    darkRatio * 58 +
    edgeDensity * 20 +
    (durationMinutes ? clamp(durationMinutes / 15, 0, 10) : 0);
  const candidates = [25, 50, 75, 100] as const;
  return candidates.reduce((best, current) =>
    Math.abs(current - raw) < Math.abs(best - raw) ? current : best,
  );
}

function deriveWasteKg(
  bagsCount: number,
  fillLevel: number,
  density: ActionVisionDensity,
  placeType?: string,
): number {
  const fillFactor =
    fillLevel === 25 ? 0.35 : fillLevel === 50 ? 0.7 : fillLevel === 75 ? 1 : 1.25;
  const densityFactor =
    density === "sec" ? 0.85 : density === "humide_dense" ? 1 : 1.18;
  const placeFactor = placeType?.toLowerCase().includes("boulevard") ||
    placeType?.toLowerCase().includes("avenue")
    ? 1.2
    : placeType?.toLowerCase().includes("parc") ||
        placeType?.toLowerCase().includes("jardin")
      ? 0.85
      : 1;
  return round(
    clamp(bagsCount * fillFactor * densityFactor * placeFactor, 0.1, 150),
    1,
  );
}

export function summarizeVisionStats(stats: ActionPhotoAnalysis[]): ActionPhotoAnalysis {
  if (stats.length === 0) {
    return {
      brightness: 0.5,
      contrast: 0.3,
      saturation: 0.2,
      darkRatio: 0.2,
      warmRatio: 0.2,
      whiteRatio: 0.2,
      edgeDensity: 0.2,
    };
  }

  const total = stats.reduce(
    (acc, item) => ({
      brightness: acc.brightness + item.brightness,
      contrast: acc.contrast + item.contrast,
      saturation: acc.saturation + item.saturation,
      darkRatio: acc.darkRatio + item.darkRatio,
      warmRatio: acc.warmRatio + item.warmRatio,
      whiteRatio: acc.whiteRatio + item.whiteRatio,
      edgeDensity: acc.edgeDensity + item.edgeDensity,
    }),
    {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      darkRatio: 0,
      warmRatio: 0,
      whiteRatio: 0,
      edgeDensity: 0,
    },
  );

  const divisor = stats.length;
  return {
    brightness: total.brightness / divisor,
    contrast: total.contrast / divisor,
    saturation: total.saturation / divisor,
    darkRatio: total.darkRatio / divisor,
    warmRatio: total.warmRatio / divisor,
    whiteRatio: total.whiteRatio / divisor,
    edgeDensity: total.edgeDensity / divisor,
  };
}

export function estimateVisionFromStats(
  stats: ActionPhotoAnalysis[],
  context: ActionVisionContext,
): ActionVisionEstimate {
  const summary = summarizeVisionStats(stats);
  const photoCount = Math.max(0, stats.length);
  const confidence = estimateConfidence(photoCount, stats, context);
  const bagsCount = clamp(
    Math.round(1 + summary.edgeDensity * 6 + summary.darkRatio * 4),
    1,
    18,
  );
  const fillLevel = fillLevelFromAnalysis(
    summary.darkRatio,
    summary.edgeDensity,
    context.durationMinutes,
  );
  const density = densityFromRatios(
    summary.saturation,
    summary.warmRatio,
    summary.darkRatio,
    summary.whiteRatio,
  );
  const wasteKg = deriveWasteKg(
    bagsCount,
    fillLevel,
    density,
    context.placeType,
  );

  const source = classifySource(photoCount, confidence);
  return {
    modelVersion: "vision-hybrid-v1",
    source,
    provisional: confidence < 0.82,
    bagsCount: {
      value: bagsCount,
      confidence,
      interval: confidenceInterval(bagsCount, confidence, Math.max(1.2, bagsCount * 0.45)),
    },
    fillLevel: {
      value: fillLevel,
      confidence: clamp(confidence - 0.04, 0.2, 0.95),
      interval: confidenceInterval(fillLevel, confidence, 30),
    },
    density: {
      value: density,
      confidence: clamp(confidence - 0.05, 0.2, 0.94),
      interval: null,
    },
    wasteKg: {
      value: wasteKg,
      confidence,
      interval: confidenceInterval(wasteKg, confidence, Math.max(0.6, wasteKg * 0.6)),
    },
  };
}

async function loadImageStats(dataUrl: string): Promise<ActionPhotoAnalysis> {
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Impossible de lire la photo."));
  });
  image.src = dataUrl;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas indisponible.");
  }
  context.drawImage(image, 0, 0, 64, 64);
  const imageData = context.getImageData(0, 0, 64, 64).data;

  let brightness = 0;
  let contrast = 0;
  let saturation = 0;
  let darkPixels = 0;
  let warmPixels = 0;
  let whitePixels = 0;
  let edgeDensity = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i] / 255;
    const g = imageData[i + 1] / 255;
    const b = imageData[i + 2] / 255;
    const avg = (r + g + b) / 3;
    brightness += avg;
    contrast += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
    saturation += Math.max(r, g, b) - Math.min(r, g, b);
    if (avg < 0.28) darkPixels += 1;
    if (r > g * 1.1 && g > b * 0.9) warmPixels += 1;
    if (avg > 0.78) whitePixels += 1;

    const x = (i / 4) % 64;
    const y = Math.floor(i / 4 / 64);
    if (x > 0) {
      const left = imageData[i - 4] / 255;
      edgeDensity += Math.abs(avg - left);
    }
    if (y > 0) {
      const top = imageData[i - 64 * 4] / 255;
      edgeDensity += Math.abs(avg - top);
    }
  }

  const pixelCount = 64 * 64;
  return {
    brightness: clamp(brightness / pixelCount, 0, 1),
    contrast: clamp(contrast / pixelCount, 0, 1),
    saturation: clamp(saturation / pixelCount, 0, 1),
    darkRatio: clamp(darkPixels / pixelCount, 0, 1),
    warmRatio: clamp(warmPixels / pixelCount, 0, 1),
    whiteRatio: clamp(whitePixels / pixelCount, 0, 1),
    edgeDensity: clamp(edgeDensity / (pixelCount * 2), 0, 1),
  };
}

export async function normalizeActionPhotos(files: File[]): Promise<ActionPhotoAsset[]> {
  const selected = files.slice(0, 3);
  const assets = await Promise.all(
    selected.map(async (file) => {
      const dataUrl = await readPhotoAsDataUrl(file);
      const dimensions = await readPhotoDimensions(dataUrl).catch(() => ({
        width: null,
        height: null,
      }));
      return {
        id: globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        mimeType: file.type || "image/*",
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        dataUrl,
      };
    }),
  );
  return assets;
}

async function readPhotoAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire la photo."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Photo invalide."));
      }
    };
    reader.readAsDataURL(file);
  });
}

async function readPhotoDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Impossible de lire la photo."));
  });
  image.src = dataUrl;
  await loaded;
  return { width: image.naturalWidth, height: image.naturalHeight };
}

export async function inferActionVisionEstimate(
  photos: ActionPhotoAsset[],
  context: ActionVisionContext,
): Promise<ActionVisionEstimate> {
  if (photos.length === 0) {
    return estimateVisionFromStats([], context);
  }
  const stats = await Promise.all(photos.map((photo) => loadImageStats(photo.dataUrl)));
  return estimateVisionFromStats(stats, context);
}
