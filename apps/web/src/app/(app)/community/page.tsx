import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

export default async function CommunityAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(appendPreservedSearchParams("/sections/community", await searchParams));
}
