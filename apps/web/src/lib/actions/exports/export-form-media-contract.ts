export type ActionDeclarationExportPresetId =
  | "png"
  | "story-instagram"
  | "publication-facebook"
  | "publication-x";

export type ActionDeclarationExportBundleId =
  | "terrain"
  | "social"
  | "institutionnel"
  | "rapport";

export type ActionDeclarationExportPreset = {
  id: ActionDeclarationExportPresetId;
  label: string;
  description: string;
  width: number;
  height: number;
  filenameSuffix: string;
};

export type ActionDeclarationExportTarget =
  | {
      id: "pdf";
      label: string;
      description: string;
      buttonLabel: string;
    }
  | (ActionDeclarationExportPreset & {
      buttonLabel: string;
    });

export type ActionDeclarationExportBundle = {
  id: ActionDeclarationExportBundleId;
  label: string;
  description: string;
  targetIds: ActionDeclarationExportTarget["id"][];
  previewTargetId: ActionDeclarationExportTarget["id"];
};
