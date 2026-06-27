import type { SupabaseClient } from "@supabase/supabase-js";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";

export const PROFILE_AVATAR_BUCKET = "avatars";

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

  const host = new URL(value).hostname.toLowerCase();
  return host.includes("clerk");
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
    const response = await fetch(params.sourceUrl);
    if (!response.ok) {
      return params.existingAvatarUrl ?? params.sourceUrl;
    }

    const contentType = response.headers.get("content-type");
    const extension = resolveAvatarExtension(contentType, params.sourceUrl);
    const filePath = `profiles/${params.userId}/avatar.${extension}`;
    const avatarBlob = await response.blob();
    const { error } = await params.supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(
      filePath,
      avatarBlob,
      {
        upsert: true,
        cacheControl: "86400",
        contentType: contentType ?? "image/jpeg",
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
