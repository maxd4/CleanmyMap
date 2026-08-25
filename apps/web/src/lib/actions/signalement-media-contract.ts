export const SIGNALEMENT_EVIDENCE_BUCKET = "signalement-evidence" as const;
export const SIGNALEMENT_EVIDENCE_MAX_MEDIA = 3;
export const SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS = 5 * 60;
export const SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SignalementEvidenceMimeType =
  (typeof SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES)[number];

export type SignalementMediaUploadState = "pending" | "ready" | "failed";

export type SignalementMediaRecord = {
  id: string;
  signalementId: string;
  createdAt: string;
  createdByClerkId: string;
  clientUploadId: string;
  storageBucket: typeof SIGNALEMENT_EVIDENCE_BUCKET;
  storagePath: string;
  originalName: string;
  mimeType: SignalementEvidenceMimeType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  uploadState: SignalementMediaUploadState;
};

export type SignalementMediaReadItem = SignalementMediaRecord & {
  signedUrl: string;
};

export type SignalementMediaReadResponse = {
  status: "ok";
  items: SignalementMediaReadItem[];
};
