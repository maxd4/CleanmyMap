"use client";

import { VibrantBackground, type VibrantBackgroundProps } from "@/components/ui/vibrant-background";

export function VibrantBackgroundNoSSR(props: VibrantBackgroundProps) {
  return <VibrantBackground {...props} />;
}
