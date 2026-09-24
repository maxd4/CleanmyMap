import { permanentRedirect } from "next/navigation";
import { buildActionCreationPanelHref } from "@/lib/actions/action-creation-routes";

type RoutePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoutePage({ searchParams }: RoutePageProps) {
  permanentRedirect(
    buildActionCreationPanelHref(
      "itineraire",
      searchParams ? await searchParams : undefined,
    ),
  );
}
