import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";
import {
  getAccentTokens,
  type BlockAccent,
} from "@/lib/ui/block-accents";

type NavigationDropdownStyle = CSSProperties & Record<string, string>;

type AccentPair = [BlockAccent, BlockAccent?];

const DEFAULT_NAVIGATION_ACCENT: BlockAccent = "amber";
const VISUALIZE_IMPACT_ROUTE_IDS = new Set(["methodologie", "reports", "gamification"]);
const NETWORK_DISCUSSION_ROUTE_IDS = new Set(["community", "feedback", "messagerie"]);

const NAVIGATION_SPACE_ACCENT_PAIRS: Record<NavigationBlockId, AccentPair> = {
  home: ["amber"],
  act: ["emerald"],
  visualize: ["sky", "red"],
  impact: ["red"],
  network: ["indigo", "pink"],
  connect: ["pink"],
  learn: ["yellow"],
};

function resolveAccentPair(spaceId: NavigationBlockId | null): AccentPair {
  return NAVIGATION_SPACE_ACCENT_PAIRS[spaceId ?? "home"] ?? NAVIGATION_SPACE_ACCENT_PAIRS.home;
}

function resolveAccent(accent: BlockAccent | undefined): BlockAccent {
  return accent ?? DEFAULT_NAVIGATION_ACCENT;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getNavigationDropdownSpaceAccents(spaceId: NavigationBlockId | null): AccentPair {
  return resolveAccentPair(spaceId);
}

export function getNavigationDropdownItemAccent(
  spaceId: NavigationBlockId | null,
  routeId?: string,
): BlockAccent {
  if (spaceId === "visualize" && routeId) {
    return VISUALIZE_IMPACT_ROUTE_IDS.has(routeId) ? "red" : "sky";
  }

  if (spaceId === "network" && routeId) {
    return NETWORK_DISCUSSION_ROUTE_IDS.has(routeId) ? "pink" : "indigo";
  }

  return resolveAccent(resolveAccentPair(spaceId)[0]);
}

export function getNavigationDropdownItemIconClassName(
  spaceId: NavigationBlockId | null,
  routeId?: string,
): string {
  const accent = getNavigationDropdownItemAccent(spaceId, routeId);

  switch (accent) {
    case "sky":
      return "bg-gradient-to-br from-cyan-100 via-white to-sky-100 shadow-[0_0_0_2px_rgba(6,182,212,0.10)]";
    case "red":
      return "bg-gradient-to-br from-rose-100 via-white to-red-100 shadow-[0_0_0_2px_rgba(244,63,94,0.10)]";
    case "emerald":
      return "bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-[0_0_0_2px_rgba(16,185,129,0.08)]";
    case "indigo":
      return "bg-gradient-to-br from-violet-100 via-white to-purple-100 shadow-[0_0_0_2px_rgba(139,92,246,0.10)]";
    case "pink":
      return "bg-gradient-to-br from-fuchsia-100 via-white to-pink-100 shadow-[0_0_0_2px_rgba(244,114,182,0.10)]";
    case "yellow":
      return "bg-gradient-to-br from-amber-100 via-white to-orange-100 shadow-[0_0_0_2px_rgba(245,158,11,0.10)]";
    case "amber":
    default:
      return "bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_0_0_2px_rgba(180,83,9,0.08)]";
  }
}

export function buildNavigationDropdownGradientStyle(
  accents: AccentPair,
): NavigationDropdownStyle {
  const [firstAccent = DEFAULT_NAVIGATION_ACCENT, secondAccent] = accents;
  const first = getAccentTokens(resolveAccent(firstAccent));
  const second = getAccentTokens(resolveAccent(secondAccent ?? firstAccent));

  const backgroundImage = secondAccent
    ? `linear-gradient(90deg, ${first.DEFAULT} 0%, ${first.dark} 42%, ${second.DEFAULT} 68%, ${second.dark} 100%)`
    : `linear-gradient(90deg, ${first.DEFAULT} 0%, ${first.dark} 100%)`;

  return {
    backgroundImage,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
  };
}

export function buildNavigationDropdownShellStyle(
  accents: AccentPair,
): NavigationDropdownStyle {
  const [firstAccent = DEFAULT_NAVIGATION_ACCENT, secondAccent] = accents;
  const first = getAccentTokens(resolveAccent(firstAccent));
  const second = getAccentTokens(resolveAccent(secondAccent ?? firstAccent));

  return {
    backgroundColor: first.light,
    backgroundImage: secondAccent
      ? `linear-gradient(135deg, ${hexToRgba(first.light, 0.98)} 0%, rgba(255,255,255,0.96) 46%, ${hexToRgba(second.light, 0.88)} 100%)`
      : `linear-gradient(135deg, ${hexToRgba(first.light, 0.98)} 0%, rgba(255,255,255,0.96) 50%, ${hexToRgba(first.DEFAULT, 0.84)} 100%)`,
    borderColor: hexToRgba(first.DEFAULT, 0.18),
    color: "#000000",
  };
}

export function buildNavigationDropdownCardStyle(
  accent: BlockAccent,
  active: boolean,
): NavigationDropdownStyle {
  const tokens = getAccentTokens(resolveAccent(accent));
  const bodyBg = active ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.82)";

  return {
    ["--nav-outer-start"]: hexToRgba(tokens.light, active ? 0.96 : 0.88),
    ["--nav-outer-mid"]: "rgba(255,255,255,0.98)",
    ["--nav-outer-end"]: hexToRgba(tokens.DEFAULT, active ? 0.92 : 0.82),
    ["--nav-body-border"]: hexToRgba(tokens.DEFAULT, active ? 0.76 : 0.66),
    ["--nav-body-border-hover"]: hexToRgba(tokens.DEFAULT, 0.9),
    ["--nav-body-bg"]: bodyBg,
    ["--nav-body-bg-hover"]: "rgba(255,255,255,1)",
    ["--nav-body-ring"]: hexToRgba(tokens.light, active ? 0.3 : 0.24),
    ["--nav-icon-border"]: hexToRgba(tokens.DEFAULT, active ? 0.58 : 0.48),
    ["--nav-icon-color"]: tokens.dark,
    ["--nav-chevron-color"]: active ? tokens.DEFAULT : tokens.dark,
    ["--nav-chevron-hover"]: active ? tokens.dark : tokens.DEFAULT,
    ["--nav-focus-ring"]: hexToRgba(tokens.DEFAULT, 0.4),
  };
}
