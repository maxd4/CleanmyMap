import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

export default async function GamificationAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(appendPreservedSearchParams("/sections/gamification", await searchParams));
}
