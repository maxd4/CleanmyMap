import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  CHAT_ATTACHMENTS_BUCKET,
} from "./chat-attachments";

type ChatAttachmentRow = {
  attachment_path?: unknown;
  attachment_url?: unknown;
  attachment_expires_at?: unknown;
  [key: string]: unknown;
};

function withoutAttachmentPath<T extends ChatAttachmentRow>(row: T): T {
  const publicRow = { ...row };
  delete publicRow.attachment_path;
  return publicRow;
}

export async function resolveChatAttachmentUrls<T extends ChatAttachmentRow>(
  serviceSupabase: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  const paths = [
    ...new Set(
      rows
        .map((row) => row.attachment_path)
        .filter((path): path is string => typeof path === "string" && path.length > 0),
    ),
  ];

  if (paths.length === 0) {
    return rows.map(withoutAttachmentPath);
  }

  const { data, error } = await serviceSupabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS);
  if (error) {
    throw error;
  }

  const signedUrlByPath = new Map<string, string>(
    (data ?? [])
      .filter(
        (entry) =>
          typeof entry.path === "string" && typeof entry.signedUrl === "string" && entry.signedUrl.length > 0,
      )
      .map((entry) => [entry.path as string, entry.signedUrl as string]),
  );
  const expiresAt = new Date(
    Date.now() + CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  return rows.map((row) => {
    const path = typeof row.attachment_path === "string" ? row.attachment_path : null;
    const signedUrl = path ? signedUrlByPath.get(path) : undefined;
    const publicRow = withoutAttachmentPath(row);
    if (!path) {
      return publicRow;
    }
    return {
      ...publicRow,
      ...(signedUrl
        ? { attachment_url: signedUrl, attachment_expires_at: expiresAt }
        : { attachment_url: null, attachment_expires_at: null }),
    } as T;
  });
}
