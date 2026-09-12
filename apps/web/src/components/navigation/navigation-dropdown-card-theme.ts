import {
  NAVIGATION_DROPDOWN_CARD_BODY_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_CHEVRON_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_ICON_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_ICON_GLYPH_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_LABEL_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_OUTER_CLASS_NAME,
} from "./navigation-dropdown-size-theme";

type NavigationDropdownCardGeometry = {
  outerClassName: string;
  bodyClassName: string;
  iconClassName: string;
  iconGlyphClassName: string;
  labelClassName: string;
  chevronClassName: string;
};

export const NAVIGATION_DROPDOWN_CARD_GEOMETRY: NavigationDropdownCardGeometry = {
  outerClassName: NAVIGATION_DROPDOWN_CARD_OUTER_CLASS_NAME,
  bodyClassName: NAVIGATION_DROPDOWN_CARD_BODY_CLASS_NAME,
  iconClassName: NAVIGATION_DROPDOWN_CARD_ICON_CLASS_NAME,
  iconGlyphClassName: NAVIGATION_DROPDOWN_CARD_ICON_GLYPH_CLASS_NAME,
  labelClassName: NAVIGATION_DROPDOWN_CARD_LABEL_CLASS_NAME,
  chevronClassName: NAVIGATION_DROPDOWN_CARD_CHEVRON_CLASS_NAME,
};

export type { NavigationDropdownCardGeometry };
