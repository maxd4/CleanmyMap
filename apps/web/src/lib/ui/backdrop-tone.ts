export type BackdropToneKey = "amber" | "emerald" | "sky" | "indigo" | "rose" | "slate";

export type BackdropTone = {
  canvas: string;
  wash: string;
  bloom: string;
  haloOne: string;
  haloTwo: string;
  haloThree: string;
};

export const BACKDROP_TONES: Record<BackdropToneKey, BackdropTone> = {
  amber: {
    canvas: "#fff8e9",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,247,225,0.58) 34%, rgba(255,236,185,0.36) 68%, rgba(255,225,149,0.16) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(255,250,233,0.92) 20%, rgba(255,240,191,0.82) 42%, rgba(255,221,123,0.36) 68%, rgba(255,248,233,0) 100%)",
    haloOne: "rgba(251, 191, 36, 0.18)",
    haloTwo: "rgba(249, 115, 22, 0.10)",
    haloThree: "rgba(253, 224, 71, 0.12)",
  },
  emerald: {
    canvas: "#f5fcf8",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.80) 0%, rgba(239,250,243,0.56) 36%, rgba(220,247,233,0.32) 68%, rgba(187,242,212,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(245,252,247,0.92) 22%, rgba(220,248,232,0.78) 44%, rgba(134,239,172,0.24) 70%, rgba(245,252,248,0) 100%)",
    haloOne: "rgba(34, 197, 94, 0.14)",
    haloTwo: "rgba(16, 185, 129, 0.10)",
    haloThree: "rgba(20, 184, 166, 0.10)",
  },
  sky: {
    canvas: "#f4f8fd",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.80) 0%, rgba(238,245,253,0.56) 36%, rgba(219,234,254,0.32) 68%, rgba(191,219,254,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(244,249,255,0.92) 22%, rgba(224,242,254,0.78) 44%, rgba(96,165,250,0.22) 70%, rgba(244,248,253,0) 100%)",
    haloOne: "rgba(14, 165, 233, 0.14)",
    haloTwo: "rgba(59, 130, 246, 0.10)",
    haloThree: "rgba(147, 197, 253, 0.10)",
  },
  indigo: {
    canvas: "#f7f7fe",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(243,244,255,0.56) 36%, rgba(233,236,255,0.34) 68%, rgba(224,231,255,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(247,247,254,0.92) 22%, rgba(237,233,255,0.76) 44%, rgba(167,139,250,0.20) 70%, rgba(247,247,254,0) 100%)",
    haloOne: "rgba(99, 102, 241, 0.14)",
    haloTwo: "rgba(129, 140, 248, 0.10)",
    haloThree: "rgba(168, 85, 247, 0.08)",
  },
  rose: {
    canvas: "#fff7f9",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(252,240,244,0.56) 36%, rgba(251,226,233,0.34) 68%, rgba(248,187,208,0.14) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(255,247,249,0.92) 22%, rgba(253,228,236,0.76) 44%, rgba(244,114,182,0.20) 70%, rgba(255,247,249,0) 100%)",
    haloOne: "rgba(244, 114, 182, 0.12)",
    haloTwo: "rgba(236, 72, 153, 0.10)",
    haloThree: "rgba(251, 113, 133, 0.08)",
  },
  slate: {
    canvas: "#fbfaf7",
    wash:
      "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(248,246,241,0.58) 38%, rgba(240,238,231,0.34) 70%, rgba(229,227,219,0.16) 100%)",
    bloom:
      "radial-gradient(ellipse 150% 110% at 50% -14%, rgba(255,255,255,0.96) 0%, rgba(251,250,247,0.92) 22%, rgba(243,240,231,0.78) 44%, rgba(203,213,225,0.18) 70%, rgba(251,250,247,0) 100%)",
    haloOne: "rgba(148, 163, 184, 0.10)",
    haloTwo: "rgba(100, 116, 139, 0.08)",
    haloThree: "rgba(226, 232, 240, 0.12)",
  },
};

export function resolveBackdropToneKey(pathname: string | null | undefined): BackdropToneKey | null {
  if (!pathname || pathname === "/") {
    return null;
  }

  const base = pathname.split("/")[1] ?? "";

  if (base === "accueil" || base === "explorer" || base === "learn") {
    return "amber";
  }

  if (
    base === "actions" ||
    base === "declaration" ||
    base === "signalement" ||
    base === "missions" ||
    base === "parcours"
  ) {
    return "emerald";
  }

  if (
    base === "dashboard" ||
    base === "pilotage" ||
    base === "observatoire" ||
    base === "reports" ||
    base === "prints" ||
    base === "methodologie"
  ) {
    return "sky";
  }

  if (
    base === "admin" ||
    base === "profil" ||
    base === "reglages" ||
    base === "onboarding" ||
    base === "partners" ||
    base === "sponsor-portal" ||
    base === "sign-in" ||
    base === "sign-up"
  ) {
    return "indigo";
  }

  if (
    base === "contact" ||
    base === "conditions-generales-utilisation" ||
    base === "conditions-utilisation" ||
    base === "mentions-legales" ||
    base === "politique-confidentialite" ||
    base === "politique-cookies" ||
    base === "en"
  ) {
    return "slate";
  }

  return "slate";
}
