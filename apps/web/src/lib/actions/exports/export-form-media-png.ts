import type { ExportForm } from "./export-form-contract";
import type { ActionDeclarationExportPreset } from "./export-form-media-contract";
import { buildActionDeclarationSocialSvg } from "./export-form-media-svg";

export async function createActionDeclarationExportPngBlob(params: {
  form: ExportForm;
  actorName: string;
  preset: ActionDeclarationExportPreset;
}): Promise<Blob> {
  const svgMarkup = buildActionDeclarationSocialSvg({
    form: params.form,
    actorName: params.actorName,
    preset: params.preset,
  });
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    const loadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossible de générer l'aperçu PNG."));
    });

    img.src = svgUrl;
    await loadPromise;

    const canvas = document.createElement("canvas");
    canvas.width = params.preset.width;
    canvas.height = params.preset.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Impossible d'initialiser le canevas PNG.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Impossible de générer l'image PNG."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
