import { permanentRedirect } from "next/navigation";
import { buildSeoRedirectTarget } from "@/lib/seo/indexability";

export default async function OpenDataAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(buildSeoRedirectTarget("/open-data", await searchParams));
}
