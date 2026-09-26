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
  ["webp", "image/webp"],
]);

const VIDEO_EXTENSIONS = new Set([
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  "wmv",
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

const SAFE_ATTACHMENT_PROTOCOLS = new Set(["http:", "https:"]);

export const CHAT_CAMERA_ACCEPT = "image/*";
export const CHAT_VIDEO_UNSUPPORTED_MESSAGE =
  "Les vidéos ne sont pas prises en charge. Partagez plutôt une photo ou un lien vers la vidéo.";

export function getChatAttachmentUnsupportedMessage(file: File): string {
  return isUnsupportedChatVideoFile(file)
    ? CHAT_VIDEO_UNSUPPORTED_MESSAGE
    : "Ce type de fichier n'est pas autorisé ici. Utilise une image, un PDF ou un document courant.";
}

export const CHAT_ATTACHMENT_ACCEPT = [
  ...Array.from(IMAGE_EXTENSIONS.values()),
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

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isSupportedChatAttachmentMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("video/")) {
    return false;
  }

  if (normalized === "image/svg+xml") {
    return false;
  }

  if (normalized.startsWith("image/")) {
    return true;
  }

  return SUPPORTED_MIME_TYPES.has(normalized);
}

export function isUnsupportedChatVideoMimeType(mimeType: string): boolean {
  return normalizeMimeType(mimeType).startsWith("video/");
}

export function isSafeChatAttachmentUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const parsed = parseUrl(value.trim());
  return parsed ? SAFE_ATTACHMENT_PROTOCOLS.has(parsed.protocol) : false;
}

export function isSupportedChatAttachmentFile(file: File): boolean {
  if (isUnsupportedChatVideoFile(file)) {
    return false;
  }

  const extension = getFileExtension(file.name);
  if (extension === "svg" || normalizeMimeType(file.type) === "image/svg+xml") {
    return false;
  }

  if (isSupportedChatAttachmentMimeType(file.type)) {
    return true;
  }

  return IMAGE_EXTENSIONS.has(extension) || SUPPORTED_EXTENSIONS.has(extension);
}

export function isUnsupportedChatVideoFile(file: File): boolean {
  if (isUnsupportedChatVideoMimeType(file.type)) {
    return true;
  }

  return VIDEO_EXTENSIONS.has(getFileExtension(file.name));
}

export function inferChatAttachmentType(file: File): string | null {
  if (isUnsupportedChatVideoFile(file)) {
    return null;
  }

  const extension = getFileExtension(file.name);
  if (extension === "svg" || normalizeMimeType(file.type) === "image/svg+xml") {
    return null;
  }

  if (isSupportedChatAttachmentMimeType(file.type)) {
    return file.type.toLowerCase();
  }

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
