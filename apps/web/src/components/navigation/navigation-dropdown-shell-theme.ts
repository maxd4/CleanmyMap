import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";

type NavigationDropdownShellTokens = {
  className: string;
  style: CSSProperties;
};

const NAVIGATION_DROPDOWN_SHELL_TOKENS: Record<NavigationBlockId, NavigationDropdownShellTokens> = {
  home: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#fff8f1",
      backgroundImage:
        "linear-gradient(135deg, rgba(255,248,241,0.98) 0%, rgba(255,240,224,0.96) 50%, rgba(217,180,138,0.84) 100%)",
      borderColor: "rgba(146, 87, 43, 0.18)",
      color: "#000000",
    },
  },
  act: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#ecfdf5",
      backgroundImage:
        "linear-gradient(135deg, rgba(236,253,245,0.98) 0%, rgba(219,252,235,0.96) 50%, rgba(167,243,208,0.84) 100%)",
      borderColor: "rgba(22, 163, 74, 0.18)",
      color: "#000000",
    },
  },
  visualize: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-[#0f2567] shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#ffffff",
      backgroundImage:
        "linear-gradient(90deg, rgba(206,244,255,0.86) 0%, rgba(255,255,255,0.98) 38%, rgba(255,238,241,0.88) 100%)",
      borderColor: "rgba(125, 211, 252, 0.36)",
      color: "#000000",
    },
  },
  impact: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#fee2e2",
      backgroundImage:
        "linear-gradient(135deg, rgba(254,226,226,0.98) 0%, rgba(252,165,165,0.96) 52%, rgba(244,63,94,0.88) 100%)",
      borderColor: "rgba(239, 68, 68, 0.18)",
      color: "#000000",
    },
  },
  network: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#f5f3ff",
      backgroundImage:
        "linear-gradient(135deg, rgba(245,243,255,0.98) 0%, rgba(221,214,254,0.96) 50%, rgba(244,114,182,0.92) 100%)",
      borderColor: "rgba(139, 92, 246, 0.18)",
      color: "#000000",
    },
  },
  connect: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#fdf2f8",
      backgroundImage:
        "linear-gradient(135deg, rgba(250,245,255,0.98) 0%, rgba(221,214,254,0.96) 46%, rgba(251,113,133,0.92) 100%)",
      borderColor: "rgba(168, 85, 247, 0.18)",
      color: "#000000",
    },
  },
  learn: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#fff8e1",
      backgroundImage:
        "linear-gradient(135deg, rgba(255,248,225,0.98) 0%, rgba(254,240,138,0.96) 50%, rgba(253,224,71,0.88) 100%)",
      borderColor: "rgba(202, 138, 4, 0.18)",
      color: "#000000",
    },
  },
  pilot: {
    className:
      "absolute left-1/2 z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-black shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]",
    style: {
      backgroundColor: "#fff7ed",
      backgroundImage:
        "linear-gradient(135deg, rgba(255,247,237,0.98) 0%, rgba(254,215,170,0.96) 50%, rgba(194,116,38,0.90) 100%)",
      borderColor: "rgba(180, 83, 9, 0.18)",
      color: "#000000",
    },
  },
};

export function getNavigationDropdownShellTokens(spaceId: NavigationBlockId | null) {
  return NAVIGATION_DROPDOWN_SHELL_TOKENS[spaceId ?? "home"];
}

export function getNavigationDropdownPanelStyle(spaceId: NavigationBlockId | null) {
  return getNavigationDropdownShellTokens(spaceId).style;
}

export type { NavigationDropdownShellTokens };
