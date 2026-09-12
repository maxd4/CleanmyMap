const LOCAL_APP_URL = "http://localhost:3000";

function firstConfiguredValue(source, keys) {
  for (const key of keys) {
    const value = source[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeOrigin(value, { forceHttps = false } = {}) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const protocol = forceHttps ? "https:" : parsed.protocol;
    return `${protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string | undefined>} [source]
 */
export function resolvePublicAppUrl(source = process.env) {
  const explicitUrl = firstConfiguredValue(source, ["NEXT_PUBLIC_APP_URL"]);
  if (explicitUrl) {
    return normalizeOrigin(explicitUrl) ?? LOCAL_APP_URL;
  }

  const vercelEnvironment = source.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnvironment === "preview") {
    const previewUrl = firstConfiguredValue(source, [
      "VERCEL_BRANCH_URL",
      "VERCEL_URL",
    ]);
    return normalizeOrigin(previewUrl, { forceHttps: true }) ?? LOCAL_APP_URL;
  }

  if (vercelEnvironment === "production") {
    const productionUrl = firstConfiguredValue(source, [
      "VERCEL_PROJECT_PRODUCTION_URL",
    ]);
    return normalizeOrigin(productionUrl, { forceHttps: true }) ?? LOCAL_APP_URL;
  }

  return LOCAL_APP_URL;
}
