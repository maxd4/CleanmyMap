"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const VibrantBackgroundImpl = dynamic(
  () => import("@/components/ui/vibrant-background").then((mod) => mod.VibrantBackground),
  { ssr: false, loading: () => null },
);

export function VibrantBackgroundNoSSR(props: ComponentProps<typeof VibrantBackgroundImpl>) {
  return <VibrantBackgroundImpl {...props} />;
}
