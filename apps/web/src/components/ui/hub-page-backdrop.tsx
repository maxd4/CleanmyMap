import { cn } from "@/lib/utils";

export type HubBackdropVariant = "explorer" | "dashboard" | "accueil" | "pilotage";

type HubBackdropTone = {
  canvas: string;
  wash: string;
  haloOne: string;
  haloTwo: string;
  haloThree: string;
  bloom: string;
};

const HUB_BACKDROP_TONES: Record<HubBackdropVariant, HubBackdropTone> = {
  explorer: {
    canvas: "#fff4d8",
    wash:
      "linear-gradient(180deg, rgba(255,251,232,0.66) 0%, rgba(255,244,190,0.42) 26%, rgba(255,232,145,0.26) 58%, rgba(255,219,122,0.18) 100%)",
    haloOne: "rgba(253, 224, 71, 0.34)",
    haloTwo: "rgba(251, 191, 36, 0.24)",
    haloThree: "rgba(249, 115, 22, 0.14)",
    bloom:
      "radial-gradient(ellipse 150% 100% at 50% -18%, rgba(255,255,255,0.88) 0%, rgba(255,250,209,0.96) 18%, rgba(255,236,141,0.88) 38%, rgba(255,214,92,0.56) 58%, rgba(255,196,52,0.22) 74%, rgba(255,244,216,0) 100%)",
  },
  dashboard: {
    canvas: "#f7e1c2",
    wash:
      "linear-gradient(180deg, rgba(255,247,232,0.34) 0%, rgba(255,233,200,0.28) 30%, rgba(229,136,35,0.16) 66%, rgba(124,45,18,0.10) 100%)",
    haloOne: "rgba(180, 83, 9, 0.24)",
    haloTwo: "rgba(245, 158, 11, 0.18)",
    haloThree: "rgba(202, 138, 4, 0.14)",
    bloom:
      "radial-gradient(ellipse 150% 100% at 50% -16%, rgba(255,248,237,0.84) 0%, rgba(255,228,183,0.76) 22%, rgba(251,191,36,0.46) 44%, rgba(180,83,9,0.18) 70%, rgba(255,242,226,0) 100%)",
  },
  accueil: {
    canvas: "#fff0b8",
    wash:
      "linear-gradient(180deg, rgba(255,249,214,0.34) 0%, rgba(255,239,183,0.30) 30%, rgba(255,224,126,0.24) 64%, rgba(251,191,36,0.12) 100%)",
    haloOne: "rgba(251, 191, 36, 0.30)",
    haloTwo: "rgba(245, 158, 11, 0.16)",
    haloThree: "rgba(253, 224, 71, 0.14)",
    bloom:
      "radial-gradient(ellipse 150% 100% at 50% -18%, rgba(255,252,234,0.86) 0%, rgba(255,246,196,0.82) 22%, rgba(255,236,141,0.70) 44%, rgba(253,224,71,0.24) 70%, rgba(255,244,211,0) 100%)",
  },
  pilotage: {
    canvas: "#f7e1c2",
    wash:
      "linear-gradient(180deg, rgba(255,247,232,0.34) 0%, rgba(255,233,200,0.28) 30%, rgba(229,136,35,0.16) 66%, rgba(124,45,18,0.10) 100%)",
    haloOne: "rgba(180, 83, 9, 0.24)",
    haloTwo: "rgba(245, 158, 11, 0.18)",
    haloThree: "rgba(202, 138, 4, 0.14)",
    bloom:
      "radial-gradient(ellipse 150% 100% at 50% -16%, rgba(255,248,237,0.84) 0%, rgba(255,228,183,0.76) 22%, rgba(251,191,36,0.46) 44%, rgba(180,83,9,0.18) 70%, rgba(255,242,226,0) 100%)",
  },
};

type HubPageBackdropProps = {
  variant: HubBackdropVariant;
  className?: string;
};

export function HubPageBackdrop({ variant, className }: HubPageBackdropProps) {
  const tone = HUB_BACKDROP_TONES[variant];

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0" style={{ backgroundColor: tone.canvas }} />
      <div className="absolute inset-0" style={{ background: tone.bloom }} />
      <div className="absolute inset-0" style={{ background: tone.wash }} />
      <div
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[120px]"
        style={{ background: tone.haloOne }}
      />
      <div
        className="absolute top-1/2 -right-32 h-[460px] w-[460px] rounded-full blur-[110px]"
        style={{ background: tone.haloTwo }}
      />
      <div
        className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full blur-[120px]"
        style={{ background: tone.haloThree }}
      />
    </div>
  );
}
