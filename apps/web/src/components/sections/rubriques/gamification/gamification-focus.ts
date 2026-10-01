const focusClasses = ["ring-2", "ring-[#c51f1f]", "ring-offset-2"];

export function focusGamificationTarget(targetId: string): void {
  if (typeof document === "undefined") return;

  const element = document.getElementById(targetId);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus({ preventScroll: true });
  focusClasses.forEach((className) => element.classList.add(className));
  window.setTimeout(() => focusClasses.forEach((className) => element.classList.remove(className)), 1800);
}

export function navigateToGamificationTarget(targetId: string): void {
  if (typeof window === "undefined") return;

  const hash = `#${targetId}`;
  if (window.location.hash === hash) {
    focusGamificationTarget(targetId);
    return;
  }

  window.location.hash = targetId;
}
