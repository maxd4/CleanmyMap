export function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
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

export async function resolveMissionActionImageUrl(
  imageUrl: string | null | undefined,
  signStoragePath: (path: string) => Promise<string | null>,
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  if (isAbsoluteHttpUrl(imageUrl)) {
    return imageUrl;
  }

  const signedUrl = await signStoragePath(imageUrl);
  return signedUrl ?? null;
}
