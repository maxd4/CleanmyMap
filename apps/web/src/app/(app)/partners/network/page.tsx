import { permanentRedirect } from "next/navigation";
import { buildSeoRedirectTarget } from "@/lib/seo/indexability";

export default async function PartnersNetworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    buildSeoRedirectTarget("/partners/network", await searchParams),
  );
}
