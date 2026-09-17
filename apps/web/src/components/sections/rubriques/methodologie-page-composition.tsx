"use client";

import { PageHeader } from "@/components/ui/page-header";
import { getNavigationSpacesForProfile } from "@/lib/navigation";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  ActionMapMethodologySection,
  LegacyMethodologieContent,
  type MethodologiePageClientProps,
} from "./methodologie-page-client";
import {
  MethodologyNavigationDocumentation,
  type MethodologyContentRegistry,
} from "./methodologie-page-navigation";
import { RouteMethodologySection } from "./route-methodology-section";

export { ActionMapMethodologySection } from "./methodologie-page-client";

export function MethodologiePageClient(props: MethodologiePageClientProps) {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("methodologie");
  const currentProfile = props.currentProfile ?? "benevole";
  const isFrench = locale === "fr";
  const navigationSpaces = getNavigationSpacesForProfile(
    currentProfile,
    "exhaustif",
    locale,
  );
  const contentByRouteId: MethodologyContentRegistry = {
    methodologie: (
      <LegacyMethodologieContent
        {...props}
        contentOnly
        includeMapAndRouteContent={false}
        includeReportsContent={false}
      />
    ),
    map: <ActionMapMethodologySection isFrench={isFrench} />,
    new: <RouteMethodologySection />,
    reports: (
      <LegacyMethodologieContent
        {...props}
        contentOnly
        includeMapAndRouteContent={false}
        includeTransverseContent={false}
      />
    ),
  };

  return (
    <div className="methodology-page relative left-1/2 w-screen -translate-x-1/2 isolate overflow-x-clip pb-20 pt-6">
      <div
        aria-hidden="true"
        className="methodology-page__ambient pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem]"
      />

      <div className="methodology-page__shell cmm-page-width flex flex-col space-y-10 px-4 pt-2 sm:px-6 lg:px-8">
        <PageHeader
          align="center"
          tone="red"
          className="methodology-page__header"
          title={
            <span className="methodology-page__title">
              <span aria-hidden="true" className="methodology-page__title-accent" />
              <span>{t("header_title")}</span>
            </span>
          }
          subtitle={t("header_desc")}
        />

        <MethodologyNavigationDocumentation
          spaces={navigationSpaces}
          locale={locale}
          contentByRouteId={contentByRouteId}
        />
      </div>
    </div>
  );
}
