export type CommonMediaRecordSource = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  client_upload_id: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  upload_state: string;
};

export type CommonMediaRecord<T extends CommonMediaRecordSource> = {
  id: T["id"];
  createdAt: T["created_at"];
  createdByClerkId: T["created_by_clerk_id"];
  clientUploadId: T["client_upload_id"];
  storageBucket: T["storage_bucket"];
  storagePath: T["storage_path"];
  originalName: T["original_name"];
  mimeType: T["mime_type"];
  sizeBytes: T["size_bytes"];
  width: T["width"];
  height: T["height"];
  sortOrder: T["sort_order"];
  uploadState: T["upload_state"];
};

export function mapCommonMediaRecord<T extends CommonMediaRecordSource>(
  row: T,
): CommonMediaRecord<T> {
  return {
    id: row.id,
    createdAt: row.created_at,
    createdByClerkId: row.created_by_clerk_id,
    clientUploadId: row.client_upload_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    uploadState: row.upload_state,
  } as CommonMediaRecord<T>;
}
