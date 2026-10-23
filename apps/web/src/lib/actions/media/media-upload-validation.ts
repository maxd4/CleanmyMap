export type MediaUploadValidationInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
};

export function validateMediaUploadInput<TMime extends string>(
  input: MediaUploadValidationInput,
  config: {
    allowedMimeTypes: readonly TMime[];
    maxSizeBytes: number;
    createError: (message: string) => Error;
  },
): asserts input is MediaUploadValidationInput & { mimeType: TMime } {
  if (
    input.originalName.trim().length < 1 ||
    input.originalName.trim().length > 255 ||
    input.clientUploadId.trim().length < 1 ||
    input.clientUploadId.trim().length > 128
  ) {
    throw config.createError("Les métadonnées photo sont invalides.");
  }
  if (!config.allowedMimeTypes.includes(input.mimeType as TMime)) {
    throw config.createError("Le format de photo n'est pas accepté.");
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > config.maxSizeBytes) {
    throw config.createError("La photo dépasse la taille autorisée.");
  }
  for (const dimension of [input.width, input.height]) {
    if (dimension !== undefined && dimension !== null && (!Number.isInteger(dimension) || dimension < 1 || dimension > 10000)) {
      throw config.createError("Les dimensions photo sont invalides.");
    }
  }
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 2)) {
    throw config.createError("L'ordre des photos est invalide.");
  }
}
