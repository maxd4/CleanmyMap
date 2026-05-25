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

type ButtonSurfaceTheme = {
  bgStart: string;
  bgEnd: string;
  hoverStart: string;
  hoverEnd: string;
  border: string;
  borderHover: string;
  text: string;
  ring: string;
};

type ButtonThemeTokens = {
  primary: ButtonSurfaceTheme;
  secondary: ButtonSurfaceTheme;
  tertiary: ButtonSurfaceTheme;
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

const BUTTON_THEME_TOKENS: Record<BackdropToneKey, ButtonThemeTokens> = {
  home: {
    primary: {
      bgStart: "#99f6e4",
      bgEnd: "#bae6fd",
      hoverStart: "#6ee7d8",
      hoverEnd: "#93c5fd",
      border: "rgba(14, 116, 144, 0.26)",
      borderHover: "rgba(14, 116, 144, 0.40)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.30)",
    },
    secondary: {
      bgStart: "#fff7ed",
      bgEnd: "#ffedd5",
      hoverStart: "#ffedd5",
      hoverEnd: "#fed7aa",
      border: "rgba(249, 115, 22, 0.24)",
      borderHover: "rgba(249, 115, 22, 0.36)",
      text: "#7c2d12",
      ring: "rgba(249, 115, 22, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(255, 247, 237, 0.56)",
      bgEnd: "rgba(254, 243, 199, 0.34)",
      hoverStart: "rgba(255, 237, 213, 0.72)",
      hoverEnd: "rgba(253, 224, 71, 0.42)",
      border: "rgba(245, 158, 11, 0.20)",
      borderHover: "rgba(245, 158, 11, 0.30)",
      text: "#92400e",
      ring: "rgba(245, 158, 11, 0.22)",
    },
  },
  pilotage: {
    primary: {
      bgStart: "#99f6e4",
      bgEnd: "#bae6fd",
      hoverStart: "#6ee7d8",
      hoverEnd: "#93c5fd",
      border: "rgba(14, 116, 144, 0.28)",
      borderHover: "rgba(14, 116, 144, 0.42)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.30)",
    },
    secondary: {
      bgStart: "#fef3c7",
      bgEnd: "#fdba74",
      hoverStart: "#fde68a",
      hoverEnd: "#f59e0b",
      border: "rgba(180, 83, 9, 0.24)",
      borderHover: "rgba(180, 83, 9, 0.36)",
      text: "#7c2d12",
      ring: "rgba(180, 83, 9, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(255, 247, 237, 0.52)",
      bgEnd: "rgba(254, 243, 199, 0.34)",
      hoverStart: "rgba(255, 237, 213, 0.70)",
      hoverEnd: "rgba(253, 224, 71, 0.40)",
      border: "rgba(180, 83, 9, 0.20)",
      borderHover: "rgba(180, 83, 9, 0.30)",
      text: "#92400e",
      ring: "rgba(180, 83, 9, 0.22)",
    },
  },
  amber: {
    primary: {
      bgStart: "#99f6e4",
      bgEnd: "#bae6fd",
      hoverStart: "#6ee7d8",
      hoverEnd: "#93c5fd",
      border: "rgba(14, 116, 144, 0.26)",
      borderHover: "rgba(14, 116, 144, 0.40)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.30)",
    },
    secondary: {
      bgStart: "#fff7ed",
      bgEnd: "#ffedd5",
      hoverStart: "#ffedd5",
      hoverEnd: "#fed7aa",
      border: "rgba(249, 115, 22, 0.24)",
      borderHover: "rgba(249, 115, 22, 0.36)",
      text: "#7c2d12",
      ring: "rgba(249, 115, 22, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(255, 247, 237, 0.56)",
      bgEnd: "rgba(254, 243, 199, 0.34)",
      hoverStart: "rgba(255, 237, 213, 0.72)",
      hoverEnd: "rgba(253, 224, 71, 0.42)",
      border: "rgba(245, 158, 11, 0.20)",
      borderHover: "rgba(245, 158, 11, 0.30)",
      text: "#92400e",
      ring: "rgba(245, 158, 11, 0.22)",
    },
  },
  emerald: {
    primary: {
      bgStart: "#fde68a",
      bgEnd: "#fdba74",
      hoverStart: "#fcd34d",
      hoverEnd: "#fb923c",
      border: "rgba(245, 158, 11, 0.24)",
      borderHover: "rgba(245, 158, 11, 0.36)",
      text: "#0f172a",
      ring: "rgba(245, 158, 11, 0.30)",
    },
    secondary: {
      bgStart: "#ecfdf5",
      bgEnd: "#bbf7d0",
      hoverStart: "#d1fae5",
      hoverEnd: "#86efac",
      border: "rgba(16, 185, 129, 0.22)",
      borderHover: "rgba(16, 185, 129, 0.34)",
      text: "#14532d",
      ring: "rgba(16, 185, 129, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(236, 253, 245, 0.58)",
      bgEnd: "rgba(209, 250, 229, 0.34)",
      hoverStart: "rgba(220, 252, 231, 0.72)",
      hoverEnd: "rgba(167, 243, 208, 0.42)",
      border: "rgba(16, 185, 129, 0.20)",
      borderHover: "rgba(16, 185, 129, 0.30)",
      text: "#14532d",
      ring: "rgba(16, 185, 129, 0.22)",
    },
  },
  sky: {
    primary: {
      bgStart: "#fde68a",
      bgEnd: "#fed7aa",
      hoverStart: "#fcd34d",
      hoverEnd: "#fdba74",
      border: "rgba(249, 115, 22, 0.24)",
      borderHover: "rgba(249, 115, 22, 0.36)",
      text: "#0f172a",
      ring: "rgba(249, 115, 22, 0.30)",
    },
    secondary: {
      bgStart: "#eff6ff",
      bgEnd: "#bae6fd",
      hoverStart: "#dbeafe",
      hoverEnd: "#7dd3fc",
      border: "rgba(14, 165, 233, 0.22)",
      borderHover: "rgba(14, 165, 233, 0.34)",
      text: "#0c4a6e",
      ring: "rgba(14, 165, 233, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(239, 246, 255, 0.58)",
      bgEnd: "rgba(191, 219, 254, 0.34)",
      hoverStart: "rgba(219, 234, 254, 0.72)",
      hoverEnd: "rgba(125, 211, 252, 0.42)",
      border: "rgba(14, 165, 233, 0.20)",
      borderHover: "rgba(14, 165, 233, 0.30)",
      text: "#0c4a6e",
      ring: "rgba(14, 165, 233, 0.22)",
    },
  },
  red: {
    primary: {
      bgStart: "#a7f3d0",
      bgEnd: "#bae6fd",
      hoverStart: "#6ee7b7",
      hoverEnd: "#93c5fd",
      border: "rgba(14, 116, 144, 0.24)",
      borderHover: "rgba(14, 116, 144, 0.36)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.28)",
    },
    secondary: {
      bgStart: "#fef2f2",
      bgEnd: "#fecaca",
      hoverStart: "#fee2e2",
      hoverEnd: "#fca5a5",
      border: "rgba(220, 38, 38, 0.20)",
      borderHover: "rgba(220, 38, 38, 0.32)",
      text: "#7f1d1d",
      ring: "rgba(220, 38, 38, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(254, 242, 242, 0.58)",
      bgEnd: "rgba(254, 226, 226, 0.34)",
      hoverStart: "rgba(252, 165, 165, 0.72)",
      hoverEnd: "rgba(248, 113, 113, 0.42)",
      border: "rgba(220, 38, 38, 0.20)",
      borderHover: "rgba(220, 38, 38, 0.30)",
      text: "#7f1d1d",
      ring: "rgba(220, 38, 38, 0.22)",
    },
  },
  rose: {
    primary: {
      bgStart: "#a7f3d0",
      bgEnd: "#d1fae5",
      hoverStart: "#6ee7b7",
      hoverEnd: "#a7f3d0",
      border: "rgba(16, 185, 129, 0.24)",
      borderHover: "rgba(16, 185, 129, 0.36)",
      text: "#0f172a",
      ring: "rgba(16, 185, 129, 0.28)",
    },
    secondary: {
      bgStart: "#fdf2f8",
      bgEnd: "#fbcfe8",
      hoverStart: "#fce7f3",
      hoverEnd: "#f9a8d4",
      border: "rgba(236, 72, 153, 0.20)",
      borderHover: "rgba(236, 72, 153, 0.32)",
      text: "#831843",
      ring: "rgba(236, 72, 153, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(253, 242, 248, 0.58)",
      bgEnd: "rgba(251, 207, 232, 0.34)",
      hoverStart: "rgba(252, 231, 243, 0.72)",
      hoverEnd: "rgba(244, 114, 182, 0.42)",
      border: "rgba(236, 72, 153, 0.20)",
      borderHover: "rgba(236, 72, 153, 0.30)",
      text: "#831843",
      ring: "rgba(236, 72, 153, 0.22)",
    },
  },
  pink: {
    primary: {
      bgStart: "#bbf7d0",
      bgEnd: "#d1fae5",
      hoverStart: "#86efac",
      hoverEnd: "#a7f3d0",
      border: "rgba(34, 197, 94, 0.24)",
      borderHover: "rgba(34, 197, 94, 0.36)",
      text: "#0f172a",
      ring: "rgba(34, 197, 94, 0.28)",
    },
    secondary: {
      bgStart: "#fdf2f8",
      bgEnd: "#fbcfe8",
      hoverStart: "#fce7f3",
      hoverEnd: "#f9a8d4",
      border: "rgba(236, 72, 153, 0.20)",
      borderHover: "rgba(236, 72, 153, 0.32)",
      text: "#831843",
      ring: "rgba(236, 72, 153, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(253, 242, 248, 0.58)",
      bgEnd: "rgba(251, 207, 232, 0.34)",
      hoverStart: "rgba(252, 231, 243, 0.72)",
      hoverEnd: "rgba(244, 114, 182, 0.42)",
      border: "rgba(236, 72, 153, 0.20)",
      borderHover: "rgba(236, 72, 153, 0.30)",
      text: "#831843",
      ring: "rgba(236, 72, 153, 0.22)",
    },
  },
  yellow: {
    primary: {
      bgStart: "#c7d2fe",
      bgEnd: "#ddd6fe",
      hoverStart: "#a5b4fc",
      hoverEnd: "#c4b5fd",
      border: "rgba(99, 102, 241, 0.24)",
      borderHover: "rgba(99, 102, 241, 0.36)",
      text: "#1e1b4b",
      ring: "rgba(99, 102, 241, 0.28)",
    },
    secondary: {
      bgStart: "#fefce8",
      bgEnd: "#fde68a",
      hoverStart: "#fef9c3",
      hoverEnd: "#fcd34d",
      border: "rgba(234, 179, 8, 0.20)",
      borderHover: "rgba(234, 179, 8, 0.32)",
      text: "#713f12",
      ring: "rgba(234, 179, 8, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(254, 252, 232, 0.58)",
      bgEnd: "rgba(253, 224, 71, 0.34)",
      hoverStart: "rgba(254, 249, 195, 0.72)",
      hoverEnd: "rgba(252, 211, 77, 0.42)",
      border: "rgba(234, 179, 8, 0.20)",
      borderHover: "rgba(234, 179, 8, 0.30)",
      text: "#713f12",
      ring: "rgba(234, 179, 8, 0.22)",
    },
  },
  indigo: {
    primary: {
      bgStart: "#fef08a",
      bgEnd: "#fed7aa",
      hoverStart: "#fde047",
      hoverEnd: "#fdba74",
      border: "rgba(249, 115, 22, 0.24)",
      borderHover: "rgba(249, 115, 22, 0.36)",
      text: "#0f172a",
      ring: "rgba(249, 115, 22, 0.28)",
    },
    secondary: {
      bgStart: "#eef2ff",
      bgEnd: "#c7d2fe",
      hoverStart: "#e0e7ff",
      hoverEnd: "#a5b4fc",
      border: "rgba(99, 102, 241, 0.20)",
      borderHover: "rgba(99, 102, 241, 0.32)",
      text: "#312e81",
      ring: "rgba(99, 102, 241, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(238, 242, 255, 0.58)",
      bgEnd: "rgba(199, 210, 254, 0.34)",
      hoverStart: "rgba(224, 231, 255, 0.72)",
      hoverEnd: "rgba(165, 180, 252, 0.42)",
      border: "rgba(99, 102, 241, 0.20)",
      borderHover: "rgba(99, 102, 241, 0.30)",
      text: "#312e81",
      ring: "rgba(99, 102, 241, 0.22)",
    },
  },
  slate: {
    primary: {
      bgStart: "#99f6e4",
      bgEnd: "#bae6fd",
      hoverStart: "#6ee7d8",
      hoverEnd: "#93c5fd",
      border: "rgba(14, 116, 144, 0.24)",
      borderHover: "rgba(14, 116, 144, 0.36)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.28)",
    },
    secondary: {
      bgStart: "#f8fafc",
      bgEnd: "#e2e8f0",
      hoverStart: "#f1f5f9",
      hoverEnd: "#cbd5e1",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.32)",
      text: "#1e293b",
      ring: "rgba(148, 163, 184, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(248, 250, 252, 0.58)",
      bgEnd: "rgba(226, 232, 240, 0.34)",
      hoverStart: "rgba(241, 245, 249, 0.72)",
      hoverEnd: "rgba(203, 213, 225, 0.42)",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.30)",
      text: "#1e293b",
      ring: "rgba(148, 163, 184, 0.22)",
    },
  },
  auth: {
    primary: {
      bgStart: "#fef3c7",
      bgEnd: "#fdba74",
      hoverStart: "#fde68a",
      hoverEnd: "#fb923c",
      border: "rgba(180, 83, 9, 0.24)",
      borderHover: "rgba(180, 83, 9, 0.36)",
      text: "#1e1b4b",
      ring: "rgba(180, 83, 9, 0.28)",
    },
    secondary: {
      bgStart: "#eef2ff",
      bgEnd: "#c7d2fe",
      hoverStart: "#e0e7ff",
      hoverEnd: "#a5b4fc",
      border: "rgba(99, 102, 241, 0.20)",
      borderHover: "rgba(99, 102, 241, 0.32)",
      text: "#312e81",
      ring: "rgba(99, 102, 241, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(238, 242, 255, 0.58)",
      bgEnd: "rgba(199, 210, 254, 0.34)",
      hoverStart: "rgba(224, 231, 255, 0.72)",
      hoverEnd: "rgba(165, 180, 252, 0.42)",
      border: "rgba(99, 102, 241, 0.20)",
      borderHover: "rgba(99, 102, 241, 0.30)",
      text: "#312e81",
      ring: "rgba(99, 102, 241, 0.22)",
    },
  },
  legal: {
    primary: {
      bgStart: "#dbeafe",
      bgEnd: "#bae6fd",
      hoverStart: "#bfdbfe",
      hoverEnd: "#7dd3fc",
      border: "rgba(14, 165, 233, 0.24)",
      borderHover: "rgba(14, 165, 233, 0.36)",
      text: "#0f172a",
      ring: "rgba(14, 165, 233, 0.28)",
    },
    secondary: {
      bgStart: "#f8fafc",
      bgEnd: "#e2e8f0",
      hoverStart: "#f1f5f9",
      hoverEnd: "#cbd5e1",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.32)",
      text: "#1e293b",
      ring: "rgba(148, 163, 184, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(248, 250, 252, 0.58)",
      bgEnd: "rgba(226, 232, 240, 0.34)",
      hoverStart: "rgba(241, 245, 249, 0.72)",
      hoverEnd: "rgba(203, 213, 225, 0.42)",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.30)",
      text: "#1e293b",
      ring: "rgba(148, 163, 184, 0.22)",
    },
  },
  system: {
    primary: {
      bgStart: "#fef3c7",
      bgEnd: "#fdba74",
      hoverStart: "#fde68a",
      hoverEnd: "#fb923c",
      border: "rgba(180, 83, 9, 0.24)",
      borderHover: "rgba(180, 83, 9, 0.36)",
      text: "#0f172a",
      ring: "rgba(180, 83, 9, 0.28)",
    },
    secondary: {
      bgStart: "#eff6ff",
      bgEnd: "#bae6fd",
      hoverStart: "#dbeafe",
      hoverEnd: "#7dd3fc",
      border: "rgba(14, 165, 233, 0.22)",
      borderHover: "rgba(14, 165, 233, 0.34)",
      text: "#0c4a6e",
      ring: "rgba(14, 165, 233, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(239, 246, 255, 0.58)",
      bgEnd: "rgba(191, 219, 254, 0.34)",
      hoverStart: "rgba(219, 234, 254, 0.72)",
      hoverEnd: "rgba(125, 211, 252, 0.42)",
      border: "rgba(14, 165, 233, 0.20)",
      borderHover: "rgba(14, 165, 233, 0.30)",
      text: "#0c4a6e",
      ring: "rgba(14, 165, 233, 0.22)",
    },
  },
  state429: {
    primary: {
      bgStart: "#fef3c7",
      bgEnd: "#fdba74",
      hoverStart: "#fde68a",
      hoverEnd: "#f59e0b",
      border: "rgba(180, 83, 9, 0.24)",
      borderHover: "rgba(180, 83, 9, 0.36)",
      text: "#1e1b4b",
      ring: "rgba(180, 83, 9, 0.28)",
    },
    secondary: {
      bgStart: "#f8fafc",
      bgEnd: "#e2e8f0",
      hoverStart: "#f1f5f9",
      hoverEnd: "#cbd5e1",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.32)",
      text: "#1e293b",
      ring: "rgba(148, 163, 184, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(255, 247, 237, 0.56)",
      bgEnd: "rgba(254, 243, 199, 0.34)",
      hoverStart: "rgba(255, 237, 213, 0.72)",
      hoverEnd: "rgba(253, 224, 71, 0.42)",
      border: "rgba(180, 83, 9, 0.20)",
      borderHover: "rgba(180, 83, 9, 0.30)",
      text: "#92400e",
      ring: "rgba(180, 83, 9, 0.22)",
    },
  },
  admin: {
    primary: {
      bgStart: "#f59e0b",
      bgEnd: "#d97706",
      hoverStart: "#fbbf24",
      hoverEnd: "#b45309",
      border: "rgba(180, 83, 9, 0.24)",
      borderHover: "rgba(180, 83, 9, 0.36)",
      text: "#111827",
      ring: "rgba(180, 83, 9, 0.28)",
    },
    secondary: {
      bgStart: "#1f2937",
      bgEnd: "#374151",
      hoverStart: "#111827",
      hoverEnd: "#4b5563",
      border: "rgba(148, 163, 184, 0.22)",
      borderHover: "rgba(148, 163, 184, 0.34)",
      text: "#f8fafc",
      ring: "rgba(148, 163, 184, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(31, 41, 55, 0.56)",
      bgEnd: "rgba(55, 65, 81, 0.34)",
      hoverStart: "rgba(17, 24, 39, 0.72)",
      hoverEnd: "rgba(75, 85, 99, 0.42)",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.30)",
      text: "#f8fafc",
      ring: "rgba(148, 163, 184, 0.22)",
    },
  },
  print: {
    primary: {
      bgStart: "#f8fafc",
      bgEnd: "#e2e8f0",
      hoverStart: "#f1f5f9",
      hoverEnd: "#cbd5e1",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.32)",
      text: "#0f172a",
      ring: "rgba(148, 163, 184, 0.24)",
    },
    secondary: {
      bgStart: "#fff7ed",
      bgEnd: "#ffedd5",
      hoverStart: "#ffedd5",
      hoverEnd: "#fed7aa",
      border: "rgba(249, 115, 22, 0.24)",
      borderHover: "rgba(249, 115, 22, 0.36)",
      text: "#7c2d12",
      ring: "rgba(249, 115, 22, 0.24)",
    },
    tertiary: {
      bgStart: "rgba(255, 247, 237, 0.56)",
      bgEnd: "rgba(254, 243, 199, 0.34)",
      hoverStart: "rgba(255, 237, 213, 0.72)",
      hoverEnd: "rgba(253, 224, 71, 0.42)",
      border: "rgba(148, 163, 184, 0.20)",
      borderHover: "rgba(148, 163, 184, 0.30)",
      text: "#0f172a",
      ring: "rgba(148, 163, 184, 0.22)",
    },
  },
};

export function getButtonThemeCssVariables(
  toneKey: BackdropToneKey | null | undefined,
): Record<string, string> | null {
  if (!toneKey) {
    return null;
  }

  const theme = BUTTON_THEME_TOKENS[toneKey];

  return {
    "--cmm-button-primary-bg-start": theme.primary.bgStart,
    "--cmm-button-primary-bg-end": theme.primary.bgEnd,
    "--cmm-button-primary-bg-hover-start": theme.primary.hoverStart,
    "--cmm-button-primary-bg-hover-end": theme.primary.hoverEnd,
    "--cmm-button-primary-border": theme.primary.border,
    "--cmm-button-primary-border-hover": theme.primary.borderHover,
    "--cmm-button-primary-text": theme.primary.text,
    "--cmm-button-primary-ring": theme.primary.ring,
    "--cmm-button-secondary-bg-start": theme.secondary.bgStart,
    "--cmm-button-secondary-bg-end": theme.secondary.bgEnd,
    "--cmm-button-secondary-bg-hover-start": theme.secondary.hoverStart,
    "--cmm-button-secondary-bg-hover-end": theme.secondary.hoverEnd,
    "--cmm-button-secondary-border": theme.secondary.border,
    "--cmm-button-secondary-border-hover": theme.secondary.borderHover,
    "--cmm-button-secondary-text": theme.secondary.text,
    "--cmm-button-secondary-ring": theme.secondary.ring,
    "--cmm-button-tertiary-bg-start": theme.tertiary.bgStart,
    "--cmm-button-tertiary-bg-end": theme.tertiary.bgEnd,
    "--cmm-button-tertiary-bg-hover-start": theme.tertiary.hoverStart,
    "--cmm-button-tertiary-bg-hover-end": theme.tertiary.hoverEnd,
    "--cmm-button-tertiary-border": theme.tertiary.border,
    "--cmm-button-tertiary-border-hover": theme.tertiary.borderHover,
    "--cmm-button-tertiary-text": theme.tertiary.text,
    "--cmm-button-tertiary-ring": theme.tertiary.ring,
  };
}

import { resolvePageFamily } from "@/lib/ui/page-families/resolve-page-family";

export function resolveBackdropToneKey(pathname: string | null | undefined): BackdropToneKey | null {
  if (!pathname) {
    return null;
  }
  return resolvePageFamily(pathname).backdropToneKey;
}
