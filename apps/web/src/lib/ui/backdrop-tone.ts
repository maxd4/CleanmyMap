import { resolvePageFamily } from "@/lib/ui/page-families/resolve-page-family";

export type BackdropToneKey =
  | "home"
  | "pilotage"
  | "amber"
  | "emerald"
  | "sky"
  | "indigo"
  | "red"
  | "rose"
  | "pink"
  | "slate"
  | "yellow"
  | "auth"
  | "legal"
  | "system"
  | "state429"
  | "admin"
  | "print";

export type BackdropTone = {
  canvas: string;
  wash: string;
  bloom: string;
  haloOne: string;
  haloTwo: string;
  haloThree: string;
};

/**
 * Règle de fond: la couche lumineuse d'un background coloré ne doit pas
 * dépasser 34% de blanc perçu. Au-delà d'environ 40%, la teinte se lave.
 * On change la teinte de page, pas la quantité de blanc.
 */
export const BACKDROP_WHITE_MIX_CEILING = 0.34;

export const BACKDROP_TONES: Record<BackdropToneKey, BackdropTone> = {
  home: {
    canvas: "#e6f8ef",
    wash:
      `linear-gradient(180deg, rgba(220,248,232,${BACKDROP_WHITE_MIX_CEILING}) 0%, rgba(187,242,212,0.30) 30%, rgba(134,239,172,0.24) 64%, rgba(52,211,153,0.12) 100%)`,
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(236,253,245,0.86) 0%, rgba(220,252,231,0.80) 22%, rgba(187,247,208,0.68) 44%, rgba(34,197,94,0.22) 70%, rgba(236,253,245,0) 100%)",
    haloOne: "rgba(34, 197, 94, 0.28)",
    haloTwo: "rgba(16, 185, 129, 0.18)",
    haloThree: "rgba(132, 204, 22, 0.14)",
  },
  pilotage: {
    canvas: "#edd4b0",
    wash:
      "linear-gradient(180deg, rgba(255,244,225,0.34) 0%, rgba(255,222,173,0.28) 30%, rgba(251,146,60,0.22) 56%, rgba(194,116,38,0.20) 72%, rgba(120,53,15,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,247,232,0.86) 0%, rgba(255,228,183,0.74) 20%, rgba(251,146,60,0.40) 40%, rgba(180,83,9,0.24) 58%, rgba(92,45,12,0.12) 76%, rgba(255,242,226,0) 100%)",
    haloOne: "rgba(249, 115, 22, 0.26)",
    haloTwo: "rgba(180, 83, 9, 0.22)",
    haloThree: "rgba(120, 53, 15, 0.16)",
  },
  amber: {
    canvas: "#edd4b0",
    wash:
      "linear-gradient(180deg, rgba(255,244,225,0.34) 0%, rgba(255,222,173,0.28) 30%, rgba(251,146,60,0.22) 56%, rgba(194,116,38,0.20) 72%, rgba(120,53,15,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,247,232,0.86) 0%, rgba(255,228,183,0.74) 20%, rgba(251,146,60,0.40) 40%, rgba(180,83,9,0.24) 58%, rgba(92,45,12,0.12) 76%, rgba(255,242,226,0) 100%)",
    haloOne: "rgba(249, 115, 22, 0.26)",
    haloTwo: "rgba(180, 83, 9, 0.22)",
    haloThree: "rgba(120, 53, 15, 0.16)",
  },
  emerald: {
    canvas: "#e8f8ef",
    wash:
      "linear-gradient(180deg, rgba(220,248,232,0.34) 0%, rgba(187,242,212,0.28) 36%, rgba(134,239,172,0.20) 68%, rgba(52,211,153,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(220,252,231,0.34) 0%, rgba(187,247,208,0.30) 22%, rgba(134,239,172,0.24) 44%, rgba(34,197,94,0.14) 70%, rgba(220,252,231,0) 100%)",
    haloOne: "rgba(34, 197, 94, 0.22)",
    haloTwo: "rgba(16, 185, 129, 0.16)",
    haloThree: "rgba(20, 184, 166, 0.14)",
  },
  sky: {
    canvas: "#ddf3fd",
    wash:
      "linear-gradient(180deg, rgba(186,230,253,0.34) 0%, rgba(147,210,253,0.28) 36%, rgba(96,165,250,0.20) 68%, rgba(14,165,233,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(207,250,254,0.34) 0%, rgba(165,243,252,0.30) 22%, rgba(103,232,249,0.24) 44%, rgba(14,165,233,0.14) 70%, rgba(207,250,254,0) 100%)",
    haloOne: "rgba(14, 165, 233, 0.26)",
    haloTwo: "rgba(59, 130, 246, 0.18)",
    haloThree: "rgba(147, 197, 253, 0.16)",
  },
  indigo: {
    canvas: "#e8e9fc",
    wash:
      "linear-gradient(180deg, rgba(224,231,255,0.34) 0%, rgba(199,210,254,0.28) 36%, rgba(165,180,252,0.20) 68%, rgba(129,140,248,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(238,242,255,0.34) 0%, rgba(224,231,255,0.30) 22%, rgba(199,210,254,0.24) 44%, rgba(129,140,248,0.16) 70%, rgba(238,242,255,0) 100%)",
    haloOne: "rgba(99, 102, 241, 0.22)",
    haloTwo: "rgba(129, 140, 248, 0.16)",
    haloThree: "rgba(168, 85, 247, 0.12)",
  },
  red: {
    canvas: "#fee2e2",
    wash:
      "linear-gradient(180deg, rgba(254,242,242,0.34) 0%, rgba(252,165,165,0.28) 36%, rgba(248,113,113,0.20) 68%, rgba(220,38,38,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,241,241,0.34) 0%, rgba(254,226,226,0.30) 22%, rgba(252,165,165,0.24) 44%, rgba(220,38,38,0.14) 70%, rgba(255,241,241,0) 100%)",
    haloOne: "rgba(220, 38, 38, 0.24)",
    haloTwo: "rgba(239, 68, 68, 0.18)",
    haloThree: "rgba(248, 113, 113, 0.14)",
  },
  rose: {
    canvas: "#fde8ef",
    wash:
      "linear-gradient(180deg, rgba(253,226,232,0.34) 0%, rgba(251,207,232,0.28) 36%, rgba(249,168,212,0.20) 68%, rgba(244,114,182,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,228,230,0.34) 0%, rgba(254,205,211,0.30) 22%, rgba(253,164,175,0.24) 44%, rgba(244,114,182,0.16) 70%, rgba(255,228,230,0) 100%)",
    haloOne: "rgba(244, 114, 182, 0.24)",
    haloTwo: "rgba(236, 72, 153, 0.18)",
    haloThree: "rgba(251, 113, 133, 0.14)",
  },
  pink: {
    canvas: "#fce7f3",
    wash:
      "linear-gradient(180deg, rgba(255,241,247,0.34) 0%, rgba(252,231,243,0.28) 36%, rgba(251,207,232,0.20) 68%, rgba(236,72,153,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,241,247,0.34) 0%, rgba(255,228,242,0.30) 22%, rgba(251,207,232,0.24) 44%, rgba(236,72,153,0.14) 70%, rgba(255,241,247,0) 100%)",
    haloOne: "rgba(236, 72, 153, 0.24)",
    haloTwo: "rgba(219, 39, 119, 0.18)",
    haloThree: "rgba(244, 114, 182, 0.14)",
  },
  slate: {
    canvas: "#eef0f3",
    wash:
      "linear-gradient(180deg, rgba(226,232,240,0.34) 0%, rgba(203,213,225,0.28) 38%, rgba(148,163,184,0.20) 70%, rgba(100,116,139,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(241,245,249,0.34) 0%, rgba(226,232,240,0.30) 22%, rgba(203,213,225,0.24) 44%, rgba(148,163,184,0.14) 70%, rgba(241,245,249,0) 100%)",
    haloOne: "rgba(148, 163, 184, 0.18)",
    haloTwo: "rgba(100, 116, 139, 0.14)",
    haloThree: "rgba(226, 232, 240, 0.16)",
  },
  yellow: {
    canvas: "#fef9c3",
    wash:
      "linear-gradient(180deg, rgba(254,249,195,0.34) 0%, rgba(253,224,71,0.28) 36%, rgba(234,179,8,0.20) 68%, rgba(161,98,7,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(254,252,232,0.34) 0%, rgba(254,249,195,0.30) 22%, rgba(253,224,71,0.24) 44%, rgba(234,179,8,0.16) 70%, rgba(254,252,232,0) 100%)",
    haloOne: "rgba(234, 179, 8, 0.30)",
    haloTwo: "rgba(253, 224, 71, 0.22)",
    haloThree: "rgba(161, 98, 7, 0.16)",
  },
  auth: {
    canvas: "#eef2ff",
    wash:
      "linear-gradient(180deg, rgba(238,242,255,0.34) 0%, rgba(221,214,254,0.28) 36%, rgba(167,139,250,0.20) 68%, rgba(99,102,241,0.12) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(238,242,255,0.34) 0%, rgba(224,231,255,0.30) 22%, rgba(196,181,253,0.24) 44%, rgba(99,102,241,0.14) 70%, rgba(238,242,255,0) 100%)",
    haloOne: "rgba(99, 102, 241, 0.24)",
    haloTwo: "rgba(168, 85, 247, 0.18)",
    haloThree: "rgba(59, 130, 246, 0.14)",
  },
  legal: {
    canvas: "#f8fafc",
    wash:
      "linear-gradient(180deg, rgba(248,250,252,0.34) 0%, rgba(226,232,240,0.28) 38%, rgba(203,213,225,0.20) 70%, rgba(148,163,184,0.10) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(248,250,252,0.34) 0%, rgba(241,245,249,0.30) 22%, rgba(226,232,240,0.24) 44%, rgba(100,116,139,0.12) 70%, rgba(248,250,252,0) 100%)",
    haloOne: "rgba(148, 163, 184, 0.18)",
    haloTwo: "rgba(100, 116, 139, 0.14)",
    haloThree: "rgba(37, 99, 235, 0.08)",
  },
  system: {
    canvas: "#eef6fb",
    wash:
      "linear-gradient(180deg, rgba(239,246,255,0.34) 0%, rgba(219,234,254,0.28) 38%, rgba(125,211,252,0.18) 70%, rgba(14,165,233,0.10) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(239,246,255,0.34) 0%, rgba(224,242,254,0.30) 22%, rgba(186,230,253,0.24) 44%, rgba(14,165,233,0.12) 70%, rgba(239,246,255,0) 100%)",
    haloOne: "rgba(14, 165, 233, 0.18)",
    haloTwo: "rgba(59, 130, 246, 0.14)",
    haloThree: "rgba(148, 163, 184, 0.12)",
  },
  state429: {
    canvas: "#fff4dd",
    wash:
      "linear-gradient(180deg, rgba(255,244,221,0.34) 0%, rgba(255,232,194,0.28) 38%, rgba(252,165,165,0.14) 70%, rgba(245,158,11,0.10) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,250,238,0.34) 0%, rgba(255,241,210,0.30) 22%, rgba(255,221,163,0.22) 44%, rgba(248,113,113,0.10) 70%, rgba(255,250,238,0) 100%)",
    haloOne: "rgba(245, 158, 11, 0.18)",
    haloTwo: "rgba(248, 113, 113, 0.12)",
    haloThree: "rgba(148, 163, 184, 0.10)",
  },
  admin: {
    canvas: "#15111d",
    wash:
      "linear-gradient(180deg, rgba(25,22,33,0.34) 0%, rgba(63,41,20,0.28) 36%, rgba(180,83,9,0.16) 68%, rgba(245,158,11,0.08) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(31,27,42,0.90) 0%, rgba(68,43,18,0.76) 22%, rgba(180,83,9,0.28) 44%, rgba(245,158,11,0.14) 70%, rgba(31,27,42,0) 100%)",
    haloOne: "rgba(245, 158, 11, 0.20)",
    haloTwo: "rgba(180, 83, 9, 0.18)",
    haloThree: "rgba(75, 85, 99, 0.18)",
  },
  print: {
    canvas: "#faf7f0",
    wash:
      "linear-gradient(180deg, rgba(250,247,240,0.34) 0%, rgba(245,240,232,0.28) 38%, rgba(226,223,214,0.20) 70%, rgba(120,113,108,0.10) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,250,243,0.34) 0%, rgba(250,247,240,0.30) 22%, rgba(245,240,232,0.24) 44%, rgba(148,163,184,0.10) 70%, rgba(255,250,243,0) 100%)",
    haloOne: "rgba(148, 163, 184, 0.14)",
    haloTwo: "rgba(120, 113, 108, 0.12)",
    haloThree: "rgba(245, 158, 11, 0.08)",
  },
};

export function resolveBackdropToneKey(pathname: string | null | undefined): BackdropToneKey | null {
  if (!pathname) {
    return null;
  }
  return resolvePageFamily(pathname).backdropToneKey;
}
