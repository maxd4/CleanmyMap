"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BACKDROP_TONES, resolveBackdropToneKey, type BackdropToneKey } from "@/lib/ui/backdrop-tone";

type VibrantBackgroundProps = {
  initialToneKey: BackdropToneKey | null;
};

export function VibrantBackground({ initialToneKey }: VibrantBackgroundProps) {
  const pathname = usePathname();
  const [toneKey, setToneKey] = useState<BackdropToneKey | null>(initialToneKey);

  useEffect(() => {
    setToneKey(resolveBackdropToneKey(pathname) ?? initialToneKey);
  }, [initialToneKey, pathname]);

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
