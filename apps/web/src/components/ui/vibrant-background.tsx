"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  BACKDROP_TONES,
  resolveBackdropToneKey,
  type BackdropToneKey,
} from "@/lib/ui/backdrop-tone";
import { getButtonThemeCssVariables } from "@/lib/ui/button-theme";

export type VibrantBackgroundProps = {
  initialToneKey: BackdropToneKey | null;
};

export function VibrantBackground({ initialToneKey }: VibrantBackgroundProps) {
  const pathname = usePathname();
  const toneKey = resolveBackdropToneKey(pathname) ?? initialToneKey;

  useEffect(() => {
    const buttonThemeVariables = getButtonThemeCssVariables(toneKey);
    if (!buttonThemeVariables) {
      return;
    }

    const bodyStyle = document.body.style;
    for (const [name, value] of Object.entries(buttonThemeVariables)) {
      bodyStyle.setProperty(name, value);
    }
  }, [toneKey]);

  if (!toneKey) {
    return null;
  }

  const tone = BACKDROP_TONES[toneKey];

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundColor: tone.canvas }} />
      <div className="absolute inset-0" style={{ backgroundImage: tone.bloom }} />
      <div className="absolute inset-0" style={{ backgroundImage: tone.wash }} />
      <div
        className="absolute -top-48 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[110px]"
        style={{ background: tone.haloOne }}
      />
      <div
        className="absolute -left-28 top-28 h-[26rem] w-[26rem] rounded-full blur-[120px]"
        style={{ background: tone.haloTwo }}
      />
      <div
        className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full blur-[120px]"
        style={{ background: tone.haloThree }}
      />
    </div>
  );
}
