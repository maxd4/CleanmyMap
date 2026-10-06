import type { ExportForm } from "./export-form-contract";
import type { ActionDeclarationExportPresetId } from "./export-form-media-contract";
import { buildActionDeclarationExportFilename } from "./export-form-media-narrative";
import { getActionDeclarationExportPreset } from "./export-form-media-presets";
import { createActionDeclarationExportPngBlob } from "./export-form-media-png";

export async function downloadActionDeclarationExportImage(params: {
  form: ExportForm;
  actorName: string;
  presetId: ActionDeclarationExportPresetId;
}): Promise<boolean> {
  const preset = getActionDeclarationExportPreset(params.presetId);
  if (!preset) {
    throw new Error("Format d'export introuvable.");
  }

  const pngBlob = await createActionDeclarationExportPngBlob({
    form: params.form,
    actorName: params.actorName,
    preset,
  });
  downloadBlob(pngBlob, buildActionDeclarationExportFilename(params.form, preset.id));
  return true;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = url;
  downloadLink.rel = "noopener";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
