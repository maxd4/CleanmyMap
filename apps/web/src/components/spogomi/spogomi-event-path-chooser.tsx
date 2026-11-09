import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { buildSpogomiEventHref, buildSpogomiEventSignInHref, type SpogomiEventDivisionType } from "@/lib/spogomi/navigation-intent";
import type { SpogomiEventJourney, SpogomiAuthorizedSpace } from "@/lib/spogomi/event-journey";

type Props = {
  eventSlug: string;
  isAuthenticated: boolean;
  selectedDivisionType?: SpogomiEventDivisionType;
  journey: SpogomiEventJourney;
};

const divisionLabel: Record<SpogomiEventDivisionType, string> = {
  casual: "Casual",
  world_cup: "World Cup",
};

export function SpogomiEventPathChooser({ eventSlug, isAuthenticated, selectedDivisionType, journey }: Props) {
  const division = selectedDivisionType ? divisionLabel[selectedDivisionType] : null;
  const divisionSuffix = division ? ` · division ${division}` : "";
  const authorizedByKey = new Map(journey.authorizedSpaces.map((space) => [space.key, space]));

  return (
    <section id="spogomi-event-paths" className="space-y-4 scroll-mt-6" aria-labelledby="spogomi-event-paths-title" data-testid="spogomi-event-path-chooser">
      <div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">Parcours pour cette édition</p>
        <h2 id="spogomi-event-paths-title" className="mt-1 text-2xl font-black text-slate-950">Choisir mon parcours</h2>
        <p className="cmm-text-body mt-1 max-w-3xl text-slate-900">Les accès et les actions ci-dessous sont contextualisés à cette compétition. Une habilitation manquante reste affichée comme telle et ne crée aucun droit.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <VolunteerPathCard eventSlug={eventSlug} selectedDivisionType={selectedDivisionType} divisionSuffix={divisionSuffix} />
        <AuthorizedPathCard
          title="Arbitres"
          description="Présences, opérations terrain, arbitrage ou résultats selon les capacités réellement attribuées à cette édition."
          space={authorizedByKey.get("referee")}
          isAuthenticated={isAuthenticated}
          signInHref={buildSpogomiEventSignInHref(eventSlug, { focus: "practical", division: selectedDivisionType })}
        />
        <AuthorizedPathCard
          title="Organisateurs"
          description="Préparer et gérer cette édition dans le cockpit prévu pour les organisateurs habilités."
          space={authorizedByKey.get("organizer")}
          isAuthenticated={isAuthenticated}
          signInHref={buildSpogomiEventSignInHref(eventSlug, { focus: "practical", division: selectedDivisionType })}
        />
      </div>
    </section>
  );
}

function VolunteerPathCard({ eventSlug, selectedDivisionType, divisionSuffix }: { eventSlug: string; selectedDivisionType?: SpogomiEventDivisionType; divisionSuffix: string }) {
  return (
    <CmmCard tone="emerald" variant="glass" className="flex h-full flex-col gap-4 p-5">
      <div>
        <h3 className="text-xl font-black text-emerald-950">Bénévoles</h3>
        <p className="cmm-text-body mt-1 text-slate-900">Consulter le règlement, passer le quiz et accéder à l’inscription de la division sélectionnée{divisionSuffix}.</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <CmmButton href={buildSpogomiEventHref(eventSlug, { focus: "quiz", division: selectedDivisionType })} tone="primary" size="sm" variant="pill">Règlement et quiz</CmmButton>
        <CmmButton href={buildSpogomiEventHref(eventSlug, { focus: "registration", division: selectedDivisionType })} tone="secondary" size="sm" variant="pill">Inscription</CmmButton>
      </div>
    </CmmCard>
  );
}

function AuthorizedPathCard({ title, description, space, isAuthenticated, signInHref }: { title: string; description: string; space?: SpogomiAuthorizedSpace; isAuthenticated: boolean; signInHref: string }) {
  return (
    <CmmCard tone="slate" variant="glass" className="flex h-full flex-col gap-4 p-5">
      <div>
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <p className="cmm-text-body mt-1 text-slate-900">{space?.description ?? description}</p>
      </div>
      <div className="mt-auto">
        {space ? <CmmButton href={space.href} tone="primary" size="sm" variant="pill">Ouvrir l’espace autorisé</CmmButton>
          : isAuthenticated ? <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-sm font-bold text-slate-700">Aucune habilitation active pour cette édition.</p>
            : <CmmButton href={signInHref} tone="secondary" size="sm" variant="pill">Se connecter pour vérifier l’accès</CmmButton>}
      </div>
    </CmmCard>
  );
}
