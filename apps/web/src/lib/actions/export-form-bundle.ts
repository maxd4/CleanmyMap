import type { FormState } from "@/components/actions/action-declaration-form.model";
import {
  downloadActionDeclarationExportImage,
  getActionDeclarationExportBundle,
  getActionDeclarationExportTargets,
  type ActionDeclarationExportBundleId,
  type ActionDeclarationExportPreset,
  type ActionDeclarationExportPresetId,
} from "@/lib/actions/export-form-media";

type ActionDeclarationExportImageTarget = ActionDeclarationExportPreset & {
  buttonLabel: string;
};

export function getActionDeclarationExportBundleImageTargets(
  bundleId: ActionDeclarationExportBundleId,
): ActionDeclarationExportImageTarget[] {
  const bundle = getActionDeclarationExportBundle(bundleId);
  const targets = new Map(getActionDeclarationExportTargets().map((target) => [target.id, target] as const));
  const allowedTargetIds = new Set(bundle.targetIds);
  const seen = new Set<string>();

  return bundle.targetIds
    .map((targetId) => targets.get(targetId))
    .filter((target): target is ActionDeclarationExportImageTarget => {
      if (!target || target.id === "pdf" || !allowedTargetIds.has(target.id) || seen.has(target.id)) {
        return false;
      }

      seen.add(target.id);
      return true;
    });
}

export async function downloadActionDeclarationExportBundle(params: {
  form: FormState;
  actorName: string;
  bundleId: ActionDeclarationExportBundleId;
}): Promise<ActionDeclarationExportPresetId[]> {
  const presets = getActionDeclarationExportBundleImageTargets(params.bundleId);
  if (presets.length === 0) {
    throw new Error("Aucun format image n'est disponible pour ce lot.");
  }

  const downloadedPresetIds: ActionDeclarationExportPresetId[] = [];
  for (const preset of presets) {
    await downloadActionDeclarationExportImage({
      form: params.form,
      actorName: params.actorName,
      presetId: preset.id,
    });
    downloadedPresetIds.push(preset.id);
    await new Promise((resolve) => window.setTimeout(resolve, 160));
  }

  return downloadedPresetIds;
}
