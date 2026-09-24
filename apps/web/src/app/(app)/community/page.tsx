import { permanentRedirect } from "next/navigation";
import { buildSeoRedirectTarget } from "@/lib/seo/indexability";

export default async function CommunityAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(buildSeoRedirectTarget("/community", await searchParams));
}
