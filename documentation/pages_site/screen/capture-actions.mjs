export function closeCookieBanner(phase = "pre") {
  return { type: "close-cookie-banner", phase };
}

export function openBlockMenu(blockLabel, phase = "post") {
  return { type: "open-block-menu", blockLabel, phase };
}

export function openPreferencesMenu(phase = "post") {
  return { type: "open-preferences-menu", phase };
}

export function clickProfileMenu(phase = "post") {
  return { type: "click-profile-menu", phase };
}

export function clickSelector(selector, phase = "post") {
  return { type: "click-selector", selector, phase };
}

export function wait(ms, phase = "post") {
  return { type: "wait", ms, phase };
}
