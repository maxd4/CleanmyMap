export type MediaUploadValidationInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
};

function hasBoundedTrimmedLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

function validateMediaIdentity(
  input: MediaUploadValidationInput,
  createError: (message: string) => Error,
): void {
  if (
    !hasBoundedTrimmedLength(input.originalName, 1, 255) ||
    !hasBoundedTrimmedLength(input.clientUploadId, 1, 128)
  ) {
    throw createError("Les métadonnées photo sont invalides.");
  }
}

function validateMediaMimeType<TMime extends string>(
  mimeType: string,
  allowedMimeTypes: readonly TMime[],
  createError: (message: string) => Error,
): asserts mimeType is TMime {
  if (!allowedMimeTypes.includes(mimeType as TMime)) {
    throw createError("Le format de photo n'est pas accepté.");
  }
}

function isValidMediaDimension(value: number | null | undefined): boolean {
  return value === undefined || value === null || (Number.isInteger(value) && value >= 1 && value <= 10000);
}

function validateMediaDimensions(
  input: MediaUploadValidationInput,
  createError: (message: string) => Error,
): void {
  if (![input.width, input.height].every(isValidMediaDimension)) {
    throw createError("Les dimensions photo sont invalides.");
  }
}

function validateMediaSize(
  sizeBytes: number,
  maxSizeBytes: number,
  createError: (message: string) => Error,
): void {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxSizeBytes) {
    throw createError("La photo dépasse la taille autorisée.");
  }
}

function validateMediaSortOrder(
  sortOrder: number | undefined,
  createError: (message: string) => Error,
): void {
  if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2)) {
    throw createError("L'ordre des photos est invalide.");
  }
}

export function validateMediaUploadInput<TMime extends string>(
  input: MediaUploadValidationInput,
  config: {
    allowedMimeTypes: readonly TMime[];
    maxSizeBytes: number;
    createError: (message: string) => Error;
  },
): asserts input is MediaUploadValidationInput & { mimeType: TMime } {
  validateMediaIdentity(input, config.createError);
  validateMediaMimeType(input.mimeType, config.allowedMimeTypes, config.createError);
  validateMediaSize(input.sizeBytes, config.maxSizeBytes, config.createError);
  validateMediaDimensions(input, config.createError);
  validateMediaSortOrder(input.sortOrder, config.createError);
}
