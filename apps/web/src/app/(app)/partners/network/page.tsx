import type { Metadata } from "next";
import { PartnersNetworkSection } from "@/components/sections/rubriques/partners-network-section";
import { getServerLocale } from "@/lib/server-preferences";

export const metadata: Metadata = {
  title: "Réseau de partenaires | CleanMyMap",
  description: "Découvrez le réseau public des partenaires CleanMyMap.",
};

export default async function PartnersNetworkPage() {
  const locale = await getServerLocale();
  return <PartnersNetworkSection fr={locale === "fr"} />;
}
