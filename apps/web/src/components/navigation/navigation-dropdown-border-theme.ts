import type { NavigationBlockId } from "@/lib/navigation";

type NavigationDropdownCardBorderTokens = {
  outerActive: string;
  outerInactive: string;
  bodyActive: string;
  bodyInactive: string;
  iconActive: string;
  iconInactive: string;
  chevronActive: string;
  chevronInactive: string;
  focusRing: string;
};

type NavigationDropdownNetworkBorderVariant = "network" | "discussion";

const NAVIGATION_DROPDOWN_CARD_BORDER_TOKENS: Record<
  NavigationBlockId,
  NavigationDropdownCardBorderTokens
> = {
  home: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(217,180,138,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(146,87,43,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(235,208,181,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(163,105,61,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-amber-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-amber-200/30 group-hover/item:bg-white",
    iconActive: "border-amber-300 text-amber-800",
    iconInactive: "border-amber-200 text-amber-800",
    chevronActive: "text-amber-700",
    chevronInactive: "text-amber-700",
    focusRing: "focus-visible:ring-amber-400/40",
  },
  act: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(167,243,208,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(22,163,74,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(209,250,229,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(34,197,94,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-emerald-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-emerald-200/30 group-hover/item:bg-white",
    iconActive: "border-emerald-300 text-emerald-700",
    iconInactive: "border-emerald-200 text-emerald-700",
    chevronActive: "text-emerald-600",
    chevronInactive: "text-emerald-700",
    focusRing: "focus-visible:ring-emerald-400/40",
  },
  visualize: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(34,211,238,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(239,68,68,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(34,211,238,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(239,68,68,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-cyan-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-cyan-200/30 group-hover/item:bg-white",
    iconActive: "border-cyan-300 text-cyan-700",
    iconInactive: "border-cyan-200 text-cyan-700",
    chevronActive: "text-red-500",
    chevronInactive: "text-cyan-700",
    focusRing: "focus-visible:ring-sky-400/40",
  },
  impact: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(239,68,68,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(225,29,72,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(239,68,68,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(225,29,72,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-rose-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-rose-200/30 group-hover/item:bg-white",
    iconActive: "border-rose-300 text-rose-600",
    iconInactive: "border-rose-200 text-rose-600",
    chevronActive: "text-rose-500",
    chevronInactive: "text-rose-600",
    focusRing: "focus-visible:ring-rose-400/40",
  },
  network: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(124,58,237,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(236,72,153,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(124,58,237,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(236,72,153,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    iconActive: "border-violet-300 text-violet-700",
    iconInactive: "border-violet-200 text-violet-700",
    chevronActive: "text-pink-500",
    chevronInactive: "text-violet-600",
    focusRing: "focus-visible:ring-fuchsia-400/40",
  },
  connect: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(219,39,119,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(139,92,246,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(219,39,119,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(139,92,246,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    iconActive: "border-pink-300 text-pink-700",
    iconInactive: "border-pink-200 text-pink-700",
    chevronActive: "text-pink-500",
    chevronInactive: "text-pink-600",
    focusRing: "focus-visible:ring-pink-400/40",
  },
  learn: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(245,158,11,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(249,115,22,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(250,204,21,0.90)_0%,rgba(255,255,255,0.96)_46%,rgba(249,115,22,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-orange-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-orange-200/30 group-hover/item:bg-white",
    iconActive: "border-amber-300 text-amber-600",
    iconInactive: "border-amber-200 text-amber-600",
    chevronActive: "text-amber-500",
    chevronInactive: "text-amber-600",
    focusRing: "focus-visible:ring-amber-400/40",
  },
  pilot: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(194,65,12,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(146,64,14,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(194,65,12,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(146,64,14,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-orange-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-orange-200/30 group-hover/item:bg-white",
    iconActive: "border-orange-300 text-orange-700",
    iconInactive: "border-orange-200 text-orange-700",
    chevronActive: "text-orange-500",
    chevronInactive: "text-orange-600",
    focusRing: "focus-visible:ring-orange-400/40",
  },
};

const NETWORK_BORDER_VARIANTS: Record<
  NavigationDropdownNetworkBorderVariant,
  NavigationDropdownCardBorderTokens
> = {
  network: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(129,140,248,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(236,72,153,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(165,180,252,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(244,114,182,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-indigo-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-indigo-200/30 group-hover/item:bg-white",
    iconActive: "border-indigo-300 text-indigo-700",
    iconInactive: "border-indigo-200 text-indigo-700",
    chevronActive: "text-indigo-600",
    chevronInactive: "text-indigo-700",
    focusRing: "focus-visible:ring-indigo-400/40",
  },
  discussion: {
    outerActive:
      "bg-[linear-gradient(90deg,rgba(244,114,182,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(248,113,113,0.92)_100%)]",
    outerInactive:
      "bg-[linear-gradient(90deg,rgba(251,207,232,0.88)_0%,rgba(255,255,255,0.95)_46%,rgba(252,165,165,0.82)_100%)]",
    bodyActive:
      "border-transparent bg-white/94 text-slate-950 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    bodyInactive:
      "border-transparent bg-white/82 group-hover/item:ring-1 group-hover/item:ring-pink-200/30 group-hover/item:bg-white",
    iconActive: "border-pink-300 text-pink-700",
    iconInactive: "border-pink-200 text-pink-700",
    chevronActive: "text-pink-600",
    chevronInactive: "text-pink-700",
    focusRing: "focus-visible:ring-pink-400/40",
  },
};

function getNetworkBorderVariant(routeId?: string): NavigationDropdownNetworkBorderVariant {
  if (routeId === "community" || routeId === "feedback" || routeId === "messagerie") {
    return "discussion";
  }
  return "network";
}

export function getNavigationDropdownCardBorderTokens(
  spaceId: NavigationBlockId | null,
  routeId?: string,
) {
  if (spaceId === "network" && routeId) {
    return NETWORK_BORDER_VARIANTS[getNetworkBorderVariant(routeId)];
  }
  return NAVIGATION_DROPDOWN_CARD_BORDER_TOKENS[spaceId ?? "home"];
}

export type { NavigationDropdownCardBorderTokens };
