import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
  RUBRIQUE_REGISTRY,
  getSectionRouteParams,
  normalizeSectionId,
  type SectionId,
} from "@/lib/sections-registry";
import { getSectionClerkAccessMode } from "@/lib/clerk-access";
import { getServerLocale } from "@/lib/server-preferences";

type SectionPageProps = {
  params: Promise<{ sectionId: string }>;
};

export function generateStaticParams() {
  return getSectionRouteParams();
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionId } = await params;
  const normalizedSectionId = normalizeSectionId(sectionId);
  const section = RUBRIQUE_REGISTRY.find(
    (item) => item.kind === "section" && item.id === normalizedSectionId,
  );

  if (!section) {
    notFound();
  }

  const sectionIdTyped = normalizedSectionId as SectionId;

  const accessMode = getSectionClerkAccessMode(normalizedSectionId);
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId && accessMode === "blur") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title={locale === "fr" ? section.label.fr : section.label.en}
        description={
          locale === "fr"
            ? clerkReachable
              ? "Cette fonctionnalité nécessite une connexion Clerk."
              : "Connexion Clerk temporairement indisponible. La vue reste lisible."
            : clerkReachable
              ? "This feature requires Clerk sign-in."
              : "Clerk sign-in is temporarily unavailable. This view stays readable."
        }
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {locale === "fr" ? "Pourquoi je suis ici" : "Why am I here"}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                {locale === "fr" ? section.label.fr : section.label.en}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {locale === "fr" ? section.description.fr : section.description.en}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === "fr" ? "Résumer" : "Summarize"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {locale === "fr"
                    ? "Aperçu public conservé pour la découverte."
                    : "Public preview kept for discovery."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === "fr" ? "Agir" : "Act"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {locale === "fr"
                    ? "Les fonctions interactives se déverrouillent après connexion."
                    : "Interactive features unlock after sign-in."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === "fr" ? "Analyser" : "Analyze"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {locale === "fr"
                    ? "Le contenu complet se déverrouille après connexion."
                    : "Full content unlocks after sign-in."}
                </p>
              </div>
            </div>
          </section>
        }
      >
        <SectionRenderer sectionId={sectionIdTyped} />
      </ClerkRequiredGate>
    );
  }

  if (!userId && accessMode === "disabled") {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="disabled"
        title={locale === "fr" ? section.label.fr : section.label.en}
        description={
          locale === "fr"
            ? "Cette vue reste lisible, mais les actions sont réservées aux comptes connectés."
            : "This view stays readable, but actions are reserved for signed-in accounts."
        }
      >
        <SectionRenderer sectionId={sectionIdTyped} />
      </ClerkRequiredGate>
    );
  }

  return <SectionRenderer sectionId={sectionIdTyped} />;
}
