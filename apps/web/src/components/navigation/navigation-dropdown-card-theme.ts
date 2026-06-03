import type { NavigationBlockId } from "@/lib/navigation";

type NavigationDropdownCardGeometry = {
  outerClassName: string;
  bodyClassName: string;
  iconClassName: string;
  iconGlyphClassName: string;
  labelClassName: string;
  chevronClassName: string;
};

const NAVIGATION_DROPDOWN_CARD_GEOMETRY: Record<
  NavigationBlockId,
  NavigationDropdownCardGeometry
> = {
  home: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  act: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  visualize: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  impact: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  network: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  connect: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
  learn: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-[1.3rem] sm:w-[1.3rem]",
    iconGlyphClassName: "h-[0.55rem] w-[0.55rem] sm:h-[0.8rem] sm:w-[0.8rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.68rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.74rem]",
    chevronClassName: "h-[0.55rem] w-[0.55rem] shrink-0 transition-colors duration-200 sm:h-[0.8rem] sm:w-[0.8rem]",
  },
  pilot: {
    outerClassName: "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
    bodyClassName:
      "flex min-h-[1.7rem] items-center gap-1.5 rounded-[calc(0.9rem-1.5px)] border px-[0.5rem] py-[0.25rem] text-left transition-all duration-200",
    iconClassName:
      "flex h-[1.45rem] w-[1.45rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-6 sm:w-6",
    iconGlyphClassName: "h-[0.6rem] w-[0.6rem] sm:h-[0.9rem] sm:w-[0.9rem]",
    labelClassName:
      "block whitespace-nowrap text-[0.7rem] font-normal tracking-tight transition-colors duration-200 group-hover/item:font-semibold sm:text-[0.76rem]",
    chevronClassName: "h-[0.6rem] w-[0.6rem] shrink-0 transition-colors duration-200 sm:h-[0.9rem] sm:w-[0.9rem]",
  },
};

export function getNavigationDropdownCardGeometry(spaceId: NavigationBlockId | null) {
  return NAVIGATION_DROPDOWN_CARD_GEOMETRY[spaceId ?? "home"];
}

export type { NavigationDropdownCardGeometry };
