const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/x-zip-compressed",
  "application/zip",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

const IMAGE_EXTENSIONS = new Map([
  ["avif", "image/avif"],
  ["gif", "image/gif"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["webp", "image/webp"],
]);

const MIME_TO_EXTENSION = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/x-7z-compressed", "7z"],
  ["application/x-rar-compressed", "rar"],
  ["application/x-zip-compressed", "zip"],
  ["application/zip", "zip"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/svg+xml", "svg"],
  ["image/webp", "webp"],
  ["text/csv", "csv"],
  ["text/markdown", "md"],
  ["text/plain", "txt"],
]);

const SUPPORTED_EXTENSIONS = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["csv", "text/csv"],
  ["txt", "text/plain"],
  ["md", "text/markdown"],
  ["zip", "application/zip"],
  ["rar", "application/x-rar-compressed"],
  ["7z", "application/x-7z-compressed"],
]);

export const CHAT_ATTACHMENT_ACCEPT = [
  "image/*",
  ...SUPPORTED_MIME_TYPES,
  ...Array.from(SUPPORTED_EXTENSIONS.keys()).map((extension) => `.${extension}`),
].join(",");

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase();
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

export function isSupportedChatAttachmentMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("image/")) {
    return true;
  }

  return SUPPORTED_MIME_TYPES.has(normalized);
}

export function isSupportedChatAttachmentFile(file: File): boolean {
  if (isSupportedChatAttachmentMimeType(file.type)) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return IMAGE_EXTENSIONS.has(extension) || SUPPORTED_EXTENSIONS.has(extension);
}

export function inferChatAttachmentType(file: File): string | null {
  if (isSupportedChatAttachmentMimeType(file.type)) {
    return file.type.toLowerCase();
  }

  const extension = getFileExtension(file.name);
  const inferredImageMimeType = IMAGE_EXTENSIONS.get(extension);
  if (inferredImageMimeType) {
    return inferredImageMimeType;
  }

  const mappedMimeType = SUPPORTED_EXTENSIONS.get(extension);
  if (mappedMimeType) {
    return mappedMimeType;
  }

  return null;
}

export function inferChatAttachmentExtension(file: File): string | null {
  const mimeType = inferChatAttachmentType(file);
  if (mimeType) {
    return MIME_TO_EXTENSION.get(mimeType) ?? (getFileExtension(file.name) || null);
  }

  const extension = getFileExtension(file.name);
  return extension || null;
}
