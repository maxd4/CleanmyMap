/**
 * Geometry shared by the desktop ribbon indicator and its contract tests.
 *
 * The dock keeps a fixed 15rem width. Triggers are 36px wide with a 2px gap;
 * the meniscus surface is wider than the active trigger so its concave
 * shoulders can meet the dock without changing the ribbon layout.
 */
export const NAVIGATION_RIBBON_DOCK_WIDTH_PX = 240;
export const NAVIGATION_RIBBON_TRIGGER_WIDTH_PX = 36;
export const NAVIGATION_RIBBON_TRIGGER_GAP_PX = 2;
export const NAVIGATION_RIBBON_INDICATOR_WIDTH_PX = 88;
export const NAVIGATION_RIBBON_MENISCUS_INDICATOR_HEIGHT_PX = 64;
export const NAVIGATION_RIBBON_MENISCUS_CIRCLE_SIZE_PX = 44;
export const NAVIGATION_RIBBON_MENISCUS_CIRCLE_CENTER_Y_PX = 12;

export function getNavigationRibbonMeniscusCircleBounds() {
  const radius = NAVIGATION_RIBBON_MENISCUS_CIRCLE_SIZE_PX / 2;

  return {
    top: NAVIGATION_RIBBON_MENISCUS_CIRCLE_CENTER_Y_PX - radius,
    bottom: NAVIGATION_RIBBON_MENISCUS_CIRCLE_CENTER_Y_PX + radius,
  };
}

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
