import {
  SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES,
  SIGNALEMENT_EVIDENCE_BUCKET,
  type SignalementEvidenceMimeType,
  type SignalementMediaUploadState,
} from "./signalement-media-contract";
import { isActionRecord } from "../query";

export type SignalementParent = {
  id: string;
  created_by_clerk_id: string;
  user_id: string;
  status: "new" | "validated" | "cleaned";
  spot_type: "spot" | "clean_place";
};

export type SignalementMediaRow = {
  id: string;
  signalement_id: string;
  created_at: string;
  created_by_clerk_id: string;
  client_upload_id: string;
  storage_bucket: typeof SIGNALEMENT_EVIDENCE_BUCKET;
  storage_path: string;
  original_name: string;
  mime_type: SignalementEvidenceMimeType;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  upload_state: SignalementMediaUploadState;
};

export function isSignalementEvidenceMimeType(value: unknown): value is SignalementEvidenceMimeType {
  return typeof value === "string" &&
    SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES.some((allowed) => allowed === value);
}

function isSignalementMediaUploadState(value: unknown): value is SignalementMediaUploadState {
  return value === "pending" || value === "ready" || value === "failed";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isSignalementParent(value: unknown): value is SignalementParent {
  return isActionRecord(value) &&
    typeof value.id === "string" &&
    typeof value.created_by_clerk_id === "string" &&
    typeof value.user_id === "string" &&
    (value.status === "new" || value.status === "validated" || value.status === "cleaned") &&
    (value.spot_type === "spot" || value.spot_type === "clean_place");
}

function hasSignalementMediaIdentity(value: Record<string, unknown>): boolean {
  return typeof value.id === "string" && typeof value.signalement_id === "string" &&
    typeof value.created_at === "string" && typeof value.created_by_clerk_id === "string" &&
    typeof value.client_upload_id === "string";
}

function hasSignalementMediaStorage(value: Record<string, unknown>): boolean {
  return value.storage_bucket === SIGNALEMENT_EVIDENCE_BUCKET &&
    typeof value.storage_path === "string" && typeof value.original_name === "string" &&
    isSignalementEvidenceMimeType(value.mime_type) && isSignalementMediaUploadState(value.upload_state);
}

function hasSignalementMediaDimensions(value: Record<string, unknown>): boolean {
  return typeof value.size_bytes === "number" && Number.isFinite(value.size_bytes) &&
    isNullableFiniteNumber(value.width) && isNullableFiniteNumber(value.height) &&
    typeof value.sort_order === "number" && Number.isFinite(value.sort_order);
}

export function isSignalementMediaRow(value: unknown): value is SignalementMediaRow {
  return isActionRecord(value) && hasSignalementMediaIdentity(value) &&
    hasSignalementMediaStorage(value) && hasSignalementMediaDimensions(value);
}
