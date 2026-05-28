"use client";

import { HomeFooter } from "@/components/accueil";
import type { HomeFooterProps } from "@/components/accueil/accueil-footer";

export function HomeFooterNoSSR(props: HomeFooterProps) {
  return <HomeFooter {...props} />;
}
