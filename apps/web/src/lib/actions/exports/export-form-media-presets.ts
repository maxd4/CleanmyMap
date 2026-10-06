import type {
  ActionDeclarationExportBundle,
  ActionDeclarationExportBundleId,
  ActionDeclarationExportPreset,
  ActionDeclarationExportTarget,
} from "./export-form-media-contract";

const ACTION_DECLARATION_EXPORT_PRESETS: ActionDeclarationExportPreset[] = [
  {
    id: "png",
    label: "PNG",
    description: "Image carrée 1080 × 1080 pour partager un résumé rapide.",
    width: 1080,
    height: 1080,
    filenameSuffix: "png",
  },
  {
    id: "story-instagram",
    label: "Story Instagram",
    description: "Format vertical 1080 × 1920 pour une story prête à publier.",
    width: 1080,
    height: 1920,
    filenameSuffix: "story-instagram",
  },
  {
    id: "publication-facebook",
    label: "Publication Facebook",
    description: "Format paysage 1200 × 630 pour un post Facebook.",
    width: 1200,
    height: 630,
    filenameSuffix: "publication-facebook",
  },
  {
    id: "publication-x",
    label: "Publication X / Twitter",
    description: "Format paysage 1600 × 900 pour un post X.",
    width: 1600,
    height: 900,
    filenameSuffix: "publication-x",
  },
];

const ACTION_DECLARATION_EXPORT_BUNDLES: ActionDeclarationExportBundle[] = [
  {
    id: "terrain",
    label: "Terrain",
    description: "Priorise l’impression et un visuel image simple à partager.",
    targetIds: ["pdf", "png"],
    previewTargetId: "png",
  },
  {
    id: "social",
    label: "Réseaux sociaux",
    description: "Mets en avant les formats verticaux et carrés prêts à publier.",
    targetIds: ["story-instagram", "png", "publication-facebook", "publication-x"],
    previewTargetId: "story-instagram",
  },
  {
    id: "institutionnel",
    label: "Institutionnel",
    description: "Met l’accent sur le PDF et la publication Facebook pour partage formel.",
    targetIds: ["pdf", "publication-facebook", "png"],
    previewTargetId: "pdf",
  },
  {
    id: "rapport",
    label: "Rapport",
    description: "Concentre l’export sur la version imprimable et l’archive visuelle.",
    targetIds: ["pdf", "png"],
    previewTargetId: "pdf",
  },
];

export function getActionDeclarationExportPreset(
  presetId: ActionDeclarationExportPreset["id"],
): ActionDeclarationExportPreset | undefined {
  return ACTION_DECLARATION_EXPORT_PRESETS.find((item) => item.id === presetId);
}

export function getActionDeclarationExportTargets(): ActionDeclarationExportTarget[] {
  return [
    {
      id: "pdf",
      label: "Fichier PDF",
      description: "Ouvre la version imprimable A4 du formulaire.",
      buttonLabel: "Ouvrir le PDF",
    },
    ...ACTION_DECLARATION_EXPORT_PRESETS.map((preset) => ({
      ...preset,
      buttonLabel: "Télécharger",
    })),
  ];
}

export function getActionDeclarationExportBundles(): ActionDeclarationExportBundle[] {
  return ACTION_DECLARATION_EXPORT_BUNDLES.map((bundle) => ({
    ...bundle,
    targetIds: [...bundle.targetIds],
  }));
}

export function getActionDeclarationExportBundle(
  bundleId: ActionDeclarationExportBundleId,
): ActionDeclarationExportBundle {
  const bundle = ACTION_DECLARATION_EXPORT_BUNDLES.find((item) => item.id === bundleId);
  if (!bundle) {
    return ACTION_DECLARATION_EXPORT_BUNDLES[0];
  }

  return {
    ...bundle,
    targetIds: [...bundle.targetIds],
  };
}
