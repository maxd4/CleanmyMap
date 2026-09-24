import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

export default async function OpenDataAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(appendPreservedSearchParams("/sections/open-data", await searchParams));
}
