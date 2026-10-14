import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerLocale } from "@/lib/server-preferences";
import { AccountSettingsEditor } from "@/components/account/account-settings-editor";
import { extractLocationPreferencesFromMetadata } from "@/lib/user-location-preference";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { HOME_ROUTE } from "@/lib/home-routes";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";

const REGLAGES_COPY = {
  fr: {
    title: "Réglages",
    subtitle: "Modifiez votre compte, votre identité publique et vos préférences depuis une seule surface.",
    metadataDescription:
      "Modifiez vos informations personnelles, votre identité publique, vos localisations et vos préférences CleanMyMap.",
    metadataKeywords: ["réglages", "paramètres", "préférences", "configuration", "CleanMyMap"],
    back: "Retour au profil",
  },
  en: {
    title: "Settings",
    subtitle: "Manage your account, public identity and preferences from one surface.",
    metadataDescription:
      "Manage your personal information, public identity, locations and CleanMyMap preferences.",
    metadataKeywords: ["settings", "preferences", "configuration", "CleanMyMap"],
    back: "Back to profile",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = REGLAGES_COPY[locale];

  return {
    title: copy.title,
    description: copy.metadataDescription,
    keywords: [...copy.metadataKeywords],
    robots: {
      index: false, // Page privée
      follow: false,
    },
  };
}

export default async function ReglagesPage() {
  const { userId } = await getSafeAuthSession();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const [identity, locale, user] = await Promise.all([
    getCurrentUserIdentity(),
    getServerLocale(),
    clerkClient().then((client) => client.users.getUser(userId)),
  ]);

  const copy = REGLAGES_COPY[locale];
  const pageFamily = resolvePageFamily("/reglages");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.45)_0%,_rgba(255,255,255,0.96)_52%,_rgba(248,250,252,1)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <CmmPageLayout>
          <PageHeader
            family={pageFamily}
            title={copy.title}
            subtitle={copy.subtitle}
            action={
              <Link
                href={PROFIL_ROUTE}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:-translate-y-[1px] hover:bg-sky-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.back}
              </Link>
            }
          />

          <CmmSectionGroup>
            {identity ? (
              <AccountSettingsEditor
                locale={locale}
                initialData={{
                  firstName: user.firstName ?? identity.firstName ?? "",
                  lastName: user.lastName ?? "",
                  email: user.primaryEmailAddress?.emailAddress ?? identity.email,
                  imageUrl: user.imageUrl ?? null,
                  handle: identity.handle,
                  displayNameMode: identity.displayNameMode ?? "full_name",
                  locationPreferences: extractLocationPreferencesFromMetadata(user.unsafeMetadata),
                  activityStatus: user.unsafeMetadata?.activity_status === "inactive" ? "inactive" : "active",
                }}
              />
            ) : null}
            <div className="flex flex-wrap gap-3 rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm">
              <Link href={PROFIL_ROUTE} className="font-bold text-sky-800 underline underline-offset-2">{locale === "fr" ? "Consulter mon profil" : "View my profile"}</Link>
              <Link href={HOME_ROUTE} className="font-bold text-sky-800 underline underline-offset-2">{locale === "fr" ? "Accueil" : "Home"}</Link>
            </div>
          </CmmSectionGroup>
      </CmmPageLayout>
    </main>
  );
}
