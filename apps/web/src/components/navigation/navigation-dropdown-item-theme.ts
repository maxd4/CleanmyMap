import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";

type NavigationDropdownItemTone = {
  labelClassName: string;
  labelStyle: CSSProperties;
  chevronClassName: string;
};

type NavigationDropdownItemToneInput = {
  labelStops: [string, string] | [string, string, string];
  chevronClassName: string;
};

type NavigationDropdownItemToneVariant = {
  labelStops: [string, string] | [string, string, string];
  chevronClassName: string;
};

const NAVIGATION_DROPDOWN_ITEM_TONES: Record<
  NavigationBlockId,
  NavigationDropdownItemToneInput
> = {
  home: {
    labelStops: ["#d97706", "#92400e"],
    chevronClassName: "text-amber-700 group-hover/item:text-amber-800",
  },
  act: {
    labelStops: ["#059669", "#047857"],
    chevronClassName: "text-emerald-700 group-hover/item:text-emerald-800",
  },
  visualize: {
    labelStops: ["#06b6d4", "#0f766e"],
    chevronClassName: "text-cyan-700 group-hover/item:text-cyan-800",
  },
  impact: {
    labelStops: ["#ef4444", "#e11d48"],
    chevronClassName: "text-rose-600 group-hover/item:text-rose-700",
  },
  network: {
    labelStops: ["#7c3aed", "#ec4899"],
    chevronClassName: "text-pink-600 group-hover/item:text-pink-700",
  },
  connect: {
    labelStops: ["#db2777", "#8b5cf6"],
    chevronClassName: "text-fuchsia-600 group-hover/item:text-fuchsia-700",
  },
  learn: {
    labelStops: ["#f59e0b", "#d97706"],
    chevronClassName: "text-orange-600 group-hover/item:text-orange-700",
  },
  pilot: {
    labelStops: ["#c2410c", "#92400e"],
    chevronClassName: "text-orange-700 group-hover/item:text-orange-800",
  },
};

function toGradientStyle(stops: [string, string] | [string, string, string]): CSSProperties {
  return {
    backgroundImage: `linear-gradient(90deg, ${stops.join(", ")})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
  };
}

function getVisualizeItemTone(routeId: string): NavigationDropdownItemToneInput {
  if (routeId === "reports" || routeId === "gamification") {
    return {
      labelStops: ["#ef4444", "#e11d48"],
      chevronClassName: "text-rose-600 group-hover/item:text-rose-700",
    };
  }

  return {
    labelStops: ["#06b6d4", "#0f766e"],
    chevronClassName: "text-cyan-700 group-hover/item:text-cyan-800",
  };
}

function getNetworkItemTone(routeId: string): NavigationDropdownItemToneVariant {
  if (routeId === "community" || routeId === "feedback" || routeId === "messagerie") {
    return {
      labelStops: ["#ec4899", "#f43f5e"],
      chevronClassName: "text-rose-500 group-hover/item:text-rose-600",
    };
  }

  if (routeId === "open-data") {
    return {
      labelStops: ["#6366f1", "#8b5cf6"],
      chevronClassName: "text-indigo-600 group-hover/item:text-indigo-700",
    };
  }

  return {
    labelStops: ["#7c3aed", "#a855f7", "#ec4899"],
    chevronClassName: "text-violet-600 group-hover/item:text-violet-700",
  };
}

export function getNavigationDropdownItemTone(
  spaceId: NavigationBlockId | null,
  routeId?: string,
): NavigationDropdownItemTone {
  const tone =
    spaceId === "visualize" && routeId
      ? getVisualizeItemTone(routeId)
      : spaceId === "network" && routeId
        ? getNetworkItemTone(routeId)
      : NAVIGATION_DROPDOWN_ITEM_TONES[spaceId ?? "home"];

  return {
    labelClassName:
      "bg-clip-text text-black transition-all duration-200 group-hover/item:text-transparent group-hover/item:[-webkit-text-fill-color:transparent] group-hover/item:font-bold group-hover/item:[filter:saturate(1.3)_brightness(1.06)]",
    labelStyle: toGradientStyle(tone.labelStops),
    chevronClassName: tone.chevronClassName,
  };
}
