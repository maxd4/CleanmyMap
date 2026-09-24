import { permanentRedirect } from "next/navigation";
import { buildSeoRedirectTarget } from "@/lib/seo/indexability";

export default async function PepitePartnerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    buildSeoRedirectTarget("/partners/network/pepite", await searchParams),
  );
}
