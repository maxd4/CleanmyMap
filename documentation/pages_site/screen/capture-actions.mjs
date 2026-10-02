export function closeCookieBanner(phase = "pre") {
  return { type: "close-cookie-banner", phase };
}
