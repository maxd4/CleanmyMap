const SAFE_REDIRECT_ORIGIN = "https://cleanmymap.invalid";

export type AuthRedirectOptions = {
  referralCode?: string;
};

function appendReferralCode(href: string, referralCode: string | undefined): string {
  const normalizedReferralCode = referralCode?.trim();
  if (!normalizedReferralCode) return href;
  return `${href}${href.includes("?") ? "&" : "?"}ref=${encodeURIComponent(normalizedReferralCode)}`;
}

function isAuthenticationRoute(pathname: string): boolean {
  return pathname === "/sign-in" || pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" || pathname.startsWith("/sign-up/");
}

export function buildSignInRedirectHref(
  internalRoute?: string,
  options?: AuthRedirectOptions,
): string {
  const safeRoute = resolveSafeAuthRedirect(internalRoute);
  const href = safeRoute
    ? `/sign-in?redirect_url=${encodeURIComponent(safeRoute)}`
    : "/sign-in";
  return appendReferralCode(href, options?.referralCode);
}

export function buildSignUpRedirectHref(
  internalRoute?: string,
  options?: AuthRedirectOptions,
): string {
  const safeRoute = resolveSafeAuthRedirect(internalRoute);
  const href = safeRoute
    ? `/sign-up?redirect_url=${encodeURIComponent(safeRoute)}`
    : "/sign-up";
  return appendReferralCode(href, options?.referralCode);
}

export function buildSignUpCompletionRedirectHref(
  internalRoute?: string,
  options?: AuthRedirectOptions,
): string {
  const safeRoute = resolveSafeAuthRedirect(internalRoute);
  const href = safeRoute
    ? `/onboarding/localisation?next=${encodeURIComponent(safeRoute)}`
    : "/onboarding/localisation";
  return appendReferralCode(href, options?.referralCode);
}

export function buildCurrentInternalRoute(
  pathname: string | null | undefined,
  search: string,
  hash: string,
): string {
  const safePathname = pathname?.startsWith("/") ? pathname : "/";
  return `${safePathname}${search ? `?${search.replace(/^\?/, "")}` : ""}${hash ? `#${hash.replace(/^#/, "")}` : ""}`;
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
    if (isAuthenticationRoute(parsed.pathname)) return undefined;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}
