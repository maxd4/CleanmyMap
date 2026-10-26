/**
 * Geometry shared by the desktop ribbon indicator and its contract tests.
 *
 * The dock keeps a fixed 15rem width. Triggers are 36px wide with a 2px gap;
 * the indicator is 76px wide so its 44px circle can sit above the selected
 * trigger without changing the ribbon layout.
 */
export const NAVIGATION_RIBBON_DOCK_WIDTH_PX = 240;
export const NAVIGATION_RIBBON_TRIGGER_WIDTH_PX = 36;
export const NAVIGATION_RIBBON_TRIGGER_GAP_PX = 2;
export const NAVIGATION_RIBBON_INDICATOR_WIDTH_PX = 76;

export function getNavigationRibbonIndicatorLeft(
  activeSpaceIndex: number,
  spaceCount: number,
): string | null {
  if (
    !Number.isInteger(activeSpaceIndex) ||
    !Number.isInteger(spaceCount) ||
    activeSpaceIndex < 0 ||
    spaceCount < 1 ||
    activeSpaceIndex >= spaceCount
  ) {
    return null;
  }

  const triggerRowWidth =
    spaceCount * NAVIGATION_RIBBON_TRIGGER_WIDTH_PX +
    (spaceCount - 1) * NAVIGATION_RIBBON_TRIGGER_GAP_PX;
  const triggerRowStart =
    (NAVIGATION_RIBBON_DOCK_WIDTH_PX - triggerRowWidth) / 2;
  const firstTriggerCenter =
    triggerRowStart +
    NAVIGATION_RIBBON_TRIGGER_WIDTH_PX / 2;
  const firstIndicatorLeft =
    firstTriggerCenter - NAVIGATION_RIBBON_INDICATOR_WIDTH_PX / 2;
  const centerOffset = NAVIGATION_RIBBON_DOCK_WIDTH_PX / 2 - firstIndicatorLeft;
  const step =
    NAVIGATION_RIBBON_TRIGGER_WIDTH_PX + NAVIGATION_RIBBON_TRIGGER_GAP_PX;

  return `calc(50% - ${centerOffset}px + ${activeSpaceIndex * step}px)`;
}
