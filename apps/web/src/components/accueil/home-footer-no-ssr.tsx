"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const HomeFooterImpl = dynamic(
  () => import("@/components/accueil").then((mod) => mod.HomeFooter),
  { ssr: false, loading: () => null },
);

export function HomeFooterNoSSR(props: ComponentProps<typeof HomeFooterImpl>) {
  return <HomeFooterImpl {...props} />;
}
