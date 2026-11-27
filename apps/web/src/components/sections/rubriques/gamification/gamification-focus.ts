const focusClasses = ["ring-2", "ring-[#c51f1f]", "ring-offset-2"];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function focusGamificationTarget(targetId: string): boolean {
  if (typeof document === "undefined") return false;

  const element = document.getElementById(targetId);
  if (!element) return false;

  element.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  element.focus({ preventScroll: true });
  focusClasses.forEach((className) => element.classList.add(className));
  window.setTimeout(() => focusClasses.forEach((className) => element.classList.remove(className)), 1800);
  return document.activeElement === element;
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
