const SAFE_REDIRECT_ORIGIN = "https://cleanmymap.invalid";

export function buildSignInRedirectHref(internalRoute: string): string {
  const safeRoute = resolveSafeAuthRedirect(internalRoute);
  if (!safeRoute) return "/sign-in";

  return `/sign-in?redirect_url=${encodeURIComponent(safeRoute)}`;
}

export function resolveSafeAuthRedirect(
  value: string | string[] | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return undefined;
  }

  try {
    const parsed = new URL(candidate, SAFE_REDIRECT_ORIGIN);
    if (parsed.origin !== SAFE_REDIRECT_ORIGIN) return undefined;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}
