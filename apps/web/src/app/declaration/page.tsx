import { permanentRedirect } from "next/navigation";
import { appendPreservedSearchParams } from "@/lib/seo/indexability";

type DeclarationRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DeclarationRedirect({ searchParams }: DeclarationRedirectProps) {
 permanentRedirect(appendPreservedSearchParams("/actions/new", await searchParams));
}
