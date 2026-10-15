import { CmmCard } from "@/components/ui/cmm-card";

type ReadinessProps = {
  event: { location_label: string; starts_at: string; ends_at: string | null };
  divisions: Array<{ id: string; division_type: string; regulation_status?: string; regulation_version?: string; regulation_source_reference?: string | null }>;
  participants: Array<{ division_id: string; team_id: string | null }>;
  teams: Array<{ id: string; division_id: string; composition_state: string }>;
  route: { file_name: string } | null;
  categoryRules: Array<{ division_id: string; label: string; measurement_kind: string; unit: string; is_complete: boolean }>;
  eventAccess: Array<{ role: string; revoked_at: string | null }>;
};

function divisionLabel(value: string): string {
  return value === "world_cup" ? "World Cup" : "Casual";
}

export function SpogomiDayReadinessChecklist({ data }: { data: ReadinessProps }) {
  const activeAccess = data.eventAccess.filter((item) => !item.revoked_at);
  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div><h2 className="cmm-text-h3">Prêt pour le jour J</h2><p className="cmm-text-small">Synthèse privée de préparation. Elle ne change pas la fiche événementielle publiable.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-black/10 bg-white/75 p-3 text-sm"><p className="font-bold">Informations pratiques</p><p>{data.event.location_label}</p><p>{new Date(data.event.starts_at).toLocaleString("fr-FR")}{data.event.ends_at ? ` → ${new Date(data.event.ends_at).toLocaleString("fr-FR")}` : ""}</p><p>Zone officielle : {data.route ? data.route.file_name : "non renseignée"}</p></div>
      <div className="rounded-xl border border-black/10 bg-white/75 p-3 text-sm"><p className="font-bold">Habilitations terrain</p><p>{activeAccess.filter((item) => item.role === "referee").length} arbitre(s) · {activeAccess.filter((item) => item.role === "checkin").length} accès de saisie des équipes</p><p>Les accès sont propres à cette édition et révocables par l’organisateur.</p></div>
    </div>
    <div className="grid gap-3 md:grid-cols-2">{data.divisions.map((division) => {
      const divisionParticipants = data.participants.filter((participant) => participant.division_id === division.id);
      const divisionTeams = data.teams.filter((team) => team.division_id === division.id);
      const unassigned = divisionParticipants.filter((participant) => !participant.team_id).length;
      const locked = divisionTeams.length > 0 && divisionTeams.every((team) => ["locked", "verified"].includes(team.composition_state));
      const categories = data.categoryRules.filter((rule) => rule.division_id === division.id);
      return <div key={division.id} className="rounded-xl border border-black/10 bg-white/75 p-3 text-sm"><p className="font-bold">{divisionLabel(division.division_type)}</p><p>Règlement : {division.regulation_status ?? "non renseigné"} · version {division.regulation_version ?? "—"}</p><p>Catégories / unités : {categories.length ? categories.map((category) => `${category.label} (${category.unit})`).join(", ") : "non renseignées"}</p><p>Équipes : {divisionTeams.length} · places non affectées : {unassigned}</p><p>Composition : {locked ? "verrouillée" : "provisoire"}</p>{division.regulation_source_reference ? <p className="text-xs text-slate-600">Source : {division.regulation_source_reference}</p> : null}</div>;
    })}</div>
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm"><p className="font-bold">Secours réseau</p><p>Utiliser la feuille de pointage imprimée ou l’export privé minimal, conserver la provenance papier, puis ressaisir chaque décision dans cette section après retour du réseau. Aucune synchronisation hors ligne automatique n’est activée.</p></div>
  </CmmCard>;
}
