import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

export default async function ConditionsUtilisationAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    appendPreservedSearchParams("/conditions-generales-utilisation", await searchParams),
  );
}
