import type { SupabaseClient } from "@supabase/supabase-js";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";

export const PROFILE_AVATAR_BUCKET = "avatars";
const CLERK_AVATAR_HOSTS = new Set(["img.clerk.com", "images.clerk.dev"]);
const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_AVATAR_TIMEOUT_MS = 4_000;

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isClerkHostedAvatarUrl(value: string | null | undefined): value is string {
  if (!isHttpUrl(value)) {
    return false;
  }

  const parsed = new URL(value);
  return (
    parsed.protocol === "https:" &&
    parsed.port === "" &&
    !parsed.username &&
    !parsed.password &&
    CLERK_AVATAR_HOSTS.has(parsed.hostname.toLowerCase())
  );
}

function isSupabaseAvatarPublicUrl(value: string | null | undefined): boolean {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (
      parsed.pathname.includes(`/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`) ||
      parsed.pathname.startsWith(`/${PROFILE_AVATAR_BUCKET}/`)
    );
  } catch {
    return false;
  }
}

function resolveAvatarExtension(contentType: string | null, fallbackUrl: string): string {
  const normalizedContentType = contentType?.trim().toLowerCase() ?? "";
  if (normalizedContentType.includes("png")) {
    return "png";
  }
  if (normalizedContentType.includes("webp")) {
    return "webp";
  }
  if (normalizedContentType.includes("gif")) {
    return "gif";
  }
  if (normalizedContentType.includes("avif")) {
    return "avif";
  }
  if (normalizedContentType.includes("svg")) {
    return "svg";
  }
  if (normalizedContentType.includes("jpeg") || normalizedContentType.includes("jpg")) {
    return "jpg";
  }

  const pathname = new URL(fallbackUrl).pathname.toLowerCase();
  const matched = pathname.match(/\.([a-z0-9]+)$/);
  if (matched?.[1]) {
    const extension = matched[1];
    if (
      extension === "png" ||
      extension === "webp" ||
      extension === "gif" ||
      extension === "avif" ||
      extension === "svg" ||
      extension === "jpg" ||
      extension === "jpeg"
    ) {
      return extension === "jpeg" ? "jpg" : extension;
    }
  }

  return "jpg";
}

async function readAvatarBlobWithLimit(
  response: Response,
  contentType: string,
): Promise<Blob | null> {
  if (!response.body) {
    const blob = await response.blob();
    return blob.size > 0 && blob.size <= PROFILE_AVATAR_MAX_BYTES ? blob : null;
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > PROFILE_AVATAR_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    const copied = new Uint8Array(value.byteLength);
    copied.set(value);
    chunks.push(copied.buffer);
  }

  return totalBytes > 0
    ? new Blob(chunks, { type: contentType })
    : null;
}

async function loadTrustedClerkAvatar(sourceUrl: string): Promise<{
  contentType: string;
  blob: Blob;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROFILE_AVATAR_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type");
    const declaredSize = Number(response.headers.get("content-length") ?? "");
    if (
      !contentType?.toLowerCase().startsWith("image/") ||
      (Number.isFinite(declaredSize) && declaredSize > PROFILE_AVATAR_MAX_BYTES)
    ) {
      return null;
    }

    const blob = await readAvatarBlobWithLimit(response, contentType);
    return blob ? { contentType, blob } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function prepareProfileAvatarUrl(params: {
  supabase: SupabaseClient;
  userId: string;
  sourceUrl: string | null | undefined;
  existingAvatarUrl?: string | null;
}): Promise<string | null> {
  if (isSupabaseAvatarPublicUrl(params.existingAvatarUrl ?? null)) {
    return params.existingAvatarUrl ?? null;
  }

  if (!isClerkHostedAvatarUrl(params.sourceUrl)) {
    return params.existingAvatarUrl ?? params.sourceUrl ?? null;
  }

  try {
    const avatar = await loadTrustedClerkAvatar(params.sourceUrl);
    if (!avatar) {
      return params.existingAvatarUrl ?? params.sourceUrl;
    }

    const extension = resolveAvatarExtension(avatar.contentType, params.sourceUrl);
    const filePath = `profiles/${params.userId}/avatar.${extension}`;
    const { error } = await params.supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(
      filePath,
      avatar.blob,
      {
        upsert: true,
        cacheControl: "86400",
        contentType: avatar.contentType,
        metadata: buildStorageBusinessMetadata({
          businessDomain: "donnees_utilisateur",
          sourceTable: "profiles",
          businessContext: "profile_avatar",
          extra: {
            userId: params.userId,
            sourceUrl: params.sourceUrl,
          },
        }),
      },
    );

    if (error) {
      return params.existingAvatarUrl ?? params.sourceUrl;
    }

    const { data } = params.supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
    return data.publicUrl ?? params.existingAvatarUrl ?? params.sourceUrl;
  } catch {
    return params.existingAvatarUrl ?? params.sourceUrl ?? null;
  }
}
