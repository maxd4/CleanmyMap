import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { SpogomiPublicRouteMap } from "@/components/spogomi/spogomi-public-route-map";
import { SpogomiIdentityLinkCard } from "@/components/spogomi/spogomi-identity-link-card";
import { SpogomiVolunteerContributionsCard } from "@/components/spogomi/spogomi-volunteer-contributions-card";
import { SpogomiPublicResults } from "@/components/spogomi/spogomi-public-results";
import { SpogomiPhotoGallery } from "@/components/spogomi/spogomi-photo-gallery";
import { SpogomiTeamJoinButton } from "@/components/spogomi/spogomi-team-join-button";
import { SpogomiAdmissionRequestCard } from "@/components/spogomi/spogomi-admission-request-card";
import { SpogomiVolunteerHelpProposalForm } from "@/components/spogomi/spogomi-volunteer-help-proposal-form";
import { loadPublishedSpogomiEventBySlug } from "@/lib/spogomi/public-service";
import { buildPageMetadata } from "@/lib/metadata";
import { isSpogomiCachanDemoEvent } from "@/lib/spogomi/demo-scenario";
import { SpogomiSyntheticDemoNotice } from "@/components/spogomi/spogomi-synthetic-demo-notice";
import { SpogomiPracticalInformation } from "@/components/spogomi/spogomi-practical-information";
import { SpogomiEventJourneyPanel } from "@/components/spogomi/spogomi-event-journey-panel";
import { SpogomiEventPathChooser } from "@/components/spogomi/spogomi-event-path-chooser";
import { SpogomiPublicEventNavigation } from "@/components/spogomi/spogomi-public-event-navigation";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadSpogomiEventJourney } from "@/lib/spogomi/event-journey-service";
import {
  buildSpogomiEventSignInHref,
  parseSpogomiEventIntent,
  type SpogomiEventFocus,
} from "@/lib/spogomi/navigation-intent";

type Props = {
  params: Promise<{ eventSlug: string }>;
  searchParams?: Promise<{
    focus?: string | string[];
    division?: string | string[];
    tab?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug } = await params;
  const event = await loadPublishedSpogomiEventBySlug(eventSlug).catch(
    () => null,
  );
  if (!event) {
    return {
      title: "Compétition SPOGOMI indisponible",
      robots: { index: false, follow: false },
    };
  }
  return buildPageMetadata(`/spogomi/${encodeURIComponent(event.slug)}`, {
    title: event.name,
    description: `Informations publiques de la compétition SPOGOMI ${event.name}.`,
    robots: { index: true, follow: true },
  });
}

export default async function SpogomiPublicEventPage({
  params,
  searchParams,
}: Props) {
  const { eventSlug } = await params;
  const event = await loadPublishedSpogomiEventBySlug(eventSlug).catch(
    () => null,
  );
  if (!event) notFound();
  const intent = parseSpogomiEventIntent(await searchParams);
  const requestedDivision =
    event.divisions.find((division) => division.type === intent.division) ??
    null;
  const selectedDivision = requestedDivision ?? event.divisions[0] ?? null;
  const selectedDivisionType = selectedDivision?.type;
  const visibleTeams = selectedDivisionType
    ? event.teams.filter((team) => team.divisionType === selectedDivisionType)
    : event.teams;
  const signInHrefFor = (focus: SpogomiEventFocus) =>
    buildSpogomiEventSignInHref(event.slug, {
      focus,
      division: selectedDivisionType,
    });
  const { userId } = await getSafeAuthSession();
  const signInHref = signInHrefFor("quiz");
  const journey = await loadSpogomiEventJourney({
    event,
    userId,
    selectedDivisionId: selectedDivision?.id ?? null,
    signInHref,
    signInHrefByStep: {
      quiz: signInHrefFor("quiz"),
      registration: signInHrefFor("registration"),
      admission: signInHrefFor("registration"),
      identity: signInHrefFor("identity"),
      team: signInHrefFor("team"),
      contributions: signInHrefFor("contributions"),
      attestations: signInHrefFor("attestations"),
    },
  });

  const lifecycleLabel =
    event.lifecycle === "upcoming"
      ? "À venir"
      : event.lifecycle === "in_progress"
        ? "En cours"
        : event.lifecycle === "cancelled"
          ? "Annulée"
          : event.lifecycle === "postponed"
            ? "Reportée"
            : "Terminée";
  const registrationLabel =
    event.registrationStatus === "open"
      ? "Inscriptions ouvertes"
      : event.registrationStatus === "capacity_reached"
        ? "Capacité atteinte"
        : event.registrationStatus === "not_open"
          ? "Inscriptions non ouvertes"
          : "Inscriptions closes";
  const resultsLabel =
    event.resultsStatus === "published"
      ? "Résultats publiés"
      : event.resultsStatus === "certified"
        ? "Résultats certifiés"
        : event.resultsStatus === "provisional"
          ? "Résultats provisoires"
          : "Résultats indisponibles";
  const modeLabel =
    event.mode === "mixed"
      ? "Casual & World Cup — deux classements séparés"
      : event.mode === "world_cup"
        ? "World Cup — équipes de trois"
        : "Casual — taille configurée pour l’événement";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-6">
        <Link
          href="/spogomi"
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"
        >
          <ArrowLeft size={16} />
          Tous les événements SPOGOMI
        </Link>
        <SpogomiPublicEventNavigation
          baseHref={`/spogomi/${encodeURIComponent(event.slug)}`}
          name={event.name}
          locationLabel={event.locationLabel}
          startsAtLabel={new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: event.officialTimezone,
          }).format(new Date(event.startsAt))}
          modeLabel={modeLabel}
          lifecycleLabel={lifecycleLabel}
          resultsLabel={resultsLabel}
          divisions={event.divisions}
          selectedDivisionType={selectedDivisionType}
          activeTab={intent.tab}
          keyFigures={[
            { label: "Divisions", value: String(event.divisions.length) },
            { label: "Équipes publiées", value: String(visibleTeams.length) },
            {
              label: "Inscrits",
              value: String(
                event.divisions.find(
                  (division) => division.type === selectedDivisionType,
                )?.registeredCount ?? 0,
              ),
            },
            { label: "Visibilité", value: resultsLabel },
          ]}
        />
        {isSpogomiCachanDemoEvent(event) ? (
          <SpogomiSyntheticDemoNotice>
            <p>
              Cette fiche publique éventuelle présente uniquement une
              simulation. Les résultats restent non officiels et la publication
              de chaque division dépend des contrôles de certification.
            </p>
          </SpogomiSyntheticDemoNotice>
        ) : null}
        <section
          id="spogomi-tab-overview"
          className="scroll-mt-6 space-y-6"
          aria-labelledby="spogomi-tab-overview-title"
        >
          <h2 id="spogomi-tab-overview-title" className="sr-only">
            Aperçu de l’édition
          </h2>
          <SpogomiEventPathChooser
            eventSlug={event.slug}
            isAuthenticated={Boolean(userId)}
            divisionTypes={event.divisions.map((division) => division.type)}
            selectedDivisionType={selectedDivisionType}
            journey={journey}
          />
          <SpogomiEventJourneyPanel
            journey={journey}
            showAuthorizedSpaces={false}
            readOnly={
              event.lifecycle === "finished" || event.lifecycle === "cancelled"
            }
          />
        </section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-6">
            <section
              id="spogomi-tab-information"
              className="scroll-mt-6 space-y-6"
              aria-labelledby="spogomi-tab-information-title"
            >
              <h2 id="spogomi-tab-information-title" className="sr-only">
                Informations de l’édition
              </h2>
              <SpogomiPracticalInformation
                startsAt={event.startsAt}
                endsAt={event.endsAt}
                officialTimezone={event.officialTimezone}
                locationLabel={event.locationLabel}
                lifecycleLabel={lifecycleLabel}
                registrationLabel={registrationLabel}
                resultsLabel={resultsLabel}
                practicalInformation={event.practicalInformation}
              />
              <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5">
                {event.actionHref ? (
                  <CmmButton
                    href={event.actionHref}
                    tone="primary"
                    size="sm"
                    variant="pill"
                  >
                    Voir l’action CleanMyMap associée
                  </CmmButton>
                ) : (
                  <p className="text-sm text-slate-600">
                    L’action CleanMyMap associée n’est pas publiée dans cette
                    vue.
                  </p>
                )}
                <CmmButton
                  href="/sections/messagerie?tab=discussions&channel=community&topicId=spogomi"
                  tone="secondary"
                  size="sm"
                  variant="pill"
                >
                  Discuter avec la communauté
                </CmmButton>
                <p className="cmm-text-small text-slate-700">
                  Ce salon est une discussion communautaire. Le règlement et les
                  résultats officiels sont ceux publiés par l’organisateur
                  habilité.
                </p>
              </CmmCard>
              {event.organizer ? (
                <CmmCard tone="slate" variant="glass" className="space-y-3 p-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Organisateur de l’édition
                    </h2>
                    <p className="cmm-text-body mt-1">
                      Cette visibilité décrit le rôle dans cette édition ; elle
                      ne constitue pas une annonce de partenariat officiel avec
                      CleanMyMap.
                    </p>
                  </div>
                  <dl className="grid gap-2 text-sm text-slate-700">
                    <div>
                      <dt className="font-bold text-slate-950">
                        Structure vérifiée
                      </dt>
                      <dd>{event.organizer.verifiedName}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-950">Rôle</dt>
                      <dd>Organisateur local de l’édition</dd>
                    </div>
                    {event.organizer.territory ? (
                      <div>
                        <dt className="font-bold text-slate-950">Territoire</dt>
                        <dd>{event.organizer.territory}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {event.organizer.officialSiteUrl ? (
                    <a
                      href={event.organizer.officialSiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline"
                    >
                      Site officiel validé
                    </a>
                  ) : null}
                  {event.organizer.partnerProfileHref ? (
                    <Link
                      href={event.organizer.partnerProfileHref}
                      className="inline-flex min-h-11 items-center font-bold text-emerald-800 hover:underline"
                    >
                      Voir la fiche partenaire dans l’Annuaire
                    </Link>
                  ) : null}
                </CmmCard>
              ) : null}
            </section>
            <section
              id="spogomi-tab-teams"
              className="scroll-mt-6"
              aria-labelledby="spogomi-tab-teams-title"
            >
              <div id="spogomi-teams" aria-hidden="true" />
              <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
                <h2 id="spogomi-tab-teams-title" className="sr-only">
                  Équipes
                </h2>
                <div>
                  <h2 className="text-xl font-black text-emerald-950">
                    Équipes
                  </h2>
                  <p className="cmm-text-body mt-1 text-slate-900">
                    Seuls les noms publics d’équipe sont affichés. Le roster
                    nominatif reste privé.
                  </p>
                </div>
                {visibleTeams.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleTeams.map((team) => (
                      <div
                        key={`${team.divisionId}-${team.teamNumber}`}
                        className="rounded-xl border border-emerald-100 bg-white/75 p-3"
                      >
                        <p className="cmm-text-small font-black uppercase tracking-wide text-emerald-800">
                          {team.divisionType === "world_cup"
                            ? "World Cup"
                            : "Casual"}
                        </p>
                        <p className="font-bold text-slate-900">
                          {team.publicName}
                        </p>
                        <p className="cmm-text-small mt-1 text-slate-600">
                          Équipe {team.teamNumber}
                        </p>
                        <div className="mt-3">
                          {event.lifecycle === "finished" ||
                          event.lifecycle === "cancelled" ? (
                            <p className="cmm-text-small font-bold text-slate-700">
                              Participation clôturée · composition publique
                            </p>
                          ) : (
                            <SpogomiTeamJoinButton
                              eventId={event.id}
                              teamId={team.id}
                              signInHref={buildSpogomiEventSignInHref(
                                event.slug,
                                { focus: "team", division: team.divisionType },
                              )}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-emerald-200 p-4 text-sm text-slate-600">
                    La composition publique n’est pas encore disponible.
                  </p>
                )}
              </CmmCard>
            </section>
            <section
              id="spogomi-tab-rankings"
              className="scroll-mt-6"
              aria-labelledby="spogomi-tab-rankings-title"
            >
              <h2 id="spogomi-tab-rankings-title" className="sr-only">
                Classements
              </h2>
              <div id="spogomi-public-results">
                <SpogomiPublicResults
                  eventSlug={event.slug}
                  initial={event.results}
                  initialDivisionId={selectedDivision?.id}
                  active={intent.tab === "rankings"}
                />
              </div>
            </section>
            <section
              id="spogomi-tab-information-route"
              className="scroll-mt-6"
              aria-labelledby="spogomi-route-title"
            >
              {event.route ? (
                <CmmCard tone="amber" variant="glass" className="space-y-3 p-5">
                  <h2
                    id="spogomi-route-title"
                    className="text-xl font-black text-amber-950"
                  >
                    Parcours officiel de référence
                  </h2>
                  <p className="cmm-text-body text-slate-900">
                    {event.route.fileName} · {event.route.referenceDistanceKm}{" "}
                    km calculés depuis le fichier. Cette géométrie ne constitue
                    pas une trace réellement parcourue.
                  </p>
                  <SpogomiPublicRouteMap
                    coordinates={event.route.coordinates}
                  />
                </CmmCard>
              ) : (
                <CmmCard
                  tone="slate"
                  variant="glass"
                  className="border-dashed p-5"
                >
                  <p
                    id="spogomi-route-title"
                    className="font-bold text-slate-900"
                  >
                    Aucun parcours officiel publié.
                  </p>
                </CmmCard>
              )}
            </section>
            <SpogomiPhotoGallery photos={event.gallery} />
          </div>
          <aside
            className="space-y-4"
            aria-label="Participation et fonctionnalités"
          >
            {event.lifecycle !== "finished" &&
            event.lifecycle !== "cancelled" ? (
              <div id="spogomi-sports-registration">
                <CmmCard
                  tone="emerald"
                  variant="glass"
                  className="space-y-3 p-5"
                >
                  <SpogomiAdmissionRequestCard
                    key={
                      requestedDivision?.id ??
                      event.divisions[0]?.id ??
                      "no-division"
                    }
                    eventId={event.id}
                    lifecycle={event.lifecycle}
                    divisions={event.divisions}
                    initialDivisionId={selectedDivision?.id}
                    registrationReadinessReady={
                      journey.registrationReadinessReady === true
                    }
                    initialQuizProofs={journey.quizProofs}
                    signInHref={signInHrefFor("registration")}
                  />
                </CmmCard>
              </div>
            ) : null}
            {!isSpogomiCachanDemoEvent(event) &&
            event.lifecycle === "upcoming" ? (
              <section
                id="spogomi-volunteer-help"
                aria-labelledby="spogomi-volunteer-help-title"
                className="space-y-2"
              >
                <p className="cmm-text-caption px-1 font-black uppercase tracking-[0.14em] text-amber-800">
                  Démarche distincte
                </p>
                <CmmCard tone="amber" variant="glass" className="space-y-3 p-5">
                  <SpogomiVolunteerHelpProposalForm
                    eventId={event.id}
                    signInHref={signInHrefFor("volunteer-help")}
                  />
                </CmmCard>
              </section>
            ) : null}
            <div id="spogomi-identity">
              <SpogomiIdentityLinkCard
                eventId={event.id}
                signInHref={signInHrefFor("identity")}
              />
            </div>
            <div id="spogomi-contributions">
              <SpogomiVolunteerContributionsCard
                eventId={event.id}
                signInHref={signInHrefFor("contributions")}
              />
            </div>
            {[
              "Classements indépendants|Les points sportifs et le ratio de mégots utilisent des projections séparées.",
              "Confidentialité|Seuls les noms publics d’équipe et les résultats publiés sont visibles.",
              "Participation|La liaison à un compte et la confirmation de participation restent séparées du classement.",
            ].map((entry) => {
              const [title, description] = entry.split("|");
              return (
                <CmmCard
                  key={title}
                  tone="slate"
                  variant="glass"
                  className="space-y-2 p-4"
                >
                  <h2 className="font-black text-slate-900">{title}</h2>
                  <p className="cmm-text-body text-slate-900">{description}</p>
                </CmmCard>
              );
            })}
          </aside>
        </div>
      </div>
    </main>
  );
}
