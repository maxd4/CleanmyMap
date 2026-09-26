const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape untrusted text before placing it in an HTML string context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

/**
 * Allow only image sources that can be rendered without executing user data.
 * Data URLs are deliberately limited to the image formats supported by Chat.
 */
export function safeImageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const source = value.trim();
  if (!source) return null;

  if (/^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(source)) {
    return source;
  }

  try {
    const parsed = new URL(source);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? source : null;
  } catch {
    return null;
  }
}
