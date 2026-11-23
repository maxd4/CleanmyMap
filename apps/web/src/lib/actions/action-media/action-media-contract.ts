export const ACTION_MEDIA_BUCKET = "action-photos" as const;
export const ACTION_MEDIA_MAX_MEDIA = 3;
// One retained image plus one replacement staged before the old object is removed.
export const ACTION_ROUTE_REFERENCE_MAX_MEDIA = 2;
export const ACTION_MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ACTION_MEDIA_SIGNED_URL_TTL_SECONDS = 5 * 60;
export const ACTION_MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ActionMediaMimeType = (typeof ACTION_MEDIA_ALLOWED_MIME_TYPES)[number];
export type ActionMediaUploadState = "pending" | "ready" | "failed";
export type ActionMediaPurpose = "report_photo" | "route_reference";

export type ActionMediaRecord = {
  id: string;
  actionId: string;
  createdAt: string;
  createdByClerkId: string;
  clientUploadId: string;
  storageBucket: typeof ACTION_MEDIA_BUCKET;
  storagePath: string;
  originalName: string;
  mimeType: ActionMediaMimeType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  uploadState: ActionMediaUploadState;
  purpose?: ActionMediaPurpose;
};

export type ActionMediaReadItem = ActionMediaRecord & { signedUrl: string; cleanupPending?: boolean };
