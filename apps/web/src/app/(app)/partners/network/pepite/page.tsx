import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

export default async function PepitePartnerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    appendPreservedSearchParams("/sections/community?tab=partners", await searchParams),
  );
}
