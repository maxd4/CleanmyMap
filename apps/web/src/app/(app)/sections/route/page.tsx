import { permanentRedirect } from "next/navigation";
import { buildSeoRedirectTarget } from "@/lib/seo/indexability";

type RoutePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoutePage({ searchParams }: RoutePageProps) {
  permanentRedirect(
    buildSeoRedirectTarget(
      "/sections/route",
      searchParams ? await searchParams : {},
    ),
  );
}
