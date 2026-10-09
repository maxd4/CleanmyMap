import { Accessibility, ShieldAlert } from "lucide-react";
import type { PublicActionPracticalInformation } from "@/lib/actions/participation/group-participation";

function PublicValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold text-emerald-900">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-relaxed text-emerald-950">{value}</dd>
    </div>
  );
}

function PublicList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold text-emerald-900">{label}</dt>
      <dd>
        {values.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-emerald-950">
            {values.map((value) => <li key={value}>{value}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </dd>
    </div>
  );
}

function accessibilityStatusLabel(value: string | null | undefined, fr: boolean): string {
  if (value === "conditions_reported") return fr ? "Conditions d'accès renseignées" : "Access conditions reported";
  if (value === "obstacles_identified") return fr ? "Obstacles identifiés" : "Obstacles identified";
  if (value === "to_confirm") return fr ? "À confirmer" : "To be confirmed";
  return fr ? "Accessibilité non évaluée" : "Accessibility not assessed";
}

export function OrganizerPracticalInformation({
  info,
  fr,
}: {
  info: PublicActionPracticalInformation;
  fr: boolean;
}) {
  const missing = fr ? "Non renseigné" : "Not provided";
  const accessibilityMissing = fr ? "Accessibilité non évaluée" : "Accessibility not assessed";
  const materialsMissing = fr ? "Matériel à confirmer" : "Equipment to be confirmed";

  return (
    <div className="rounded-xl border border-white/80 bg-white/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-800">
        <Accessibility size={15} aria-hidden="true" />
        {fr ? "Indications de l’organisateur" : "Organizer information"}
      </div>
      <dl className="space-y-3">
        <PublicValue label={fr ? "État de l'accessibilité" : "Accessibility status"} value={accessibilityStatusLabel(info.accessibilityStatus, fr)} />
        <PublicValue label={fr ? "Accès, obstacles et conditions" : "Access, obstacles and conditions"} value={info.accessibility ?? accessibilityMissing} />
        <PublicValue label={fr ? "Consignes de sécurité" : "Safety instructions"} value={info.safetyInstructions ?? missing} />
        <PublicValue label={fr ? "Matériel à apporter" : "Equipment to bring"} value={info.materialsToBring ?? materialsMissing} />
        <PublicList label={fr ? "Suggestions rapides" : "Quick suggestions"} values={info.suggestedMaterials ?? []} empty={materialsMissing} />
        <PublicValue label={fr ? "Matériel fourni" : "Equipment provided"} value={info.materialsProvided ?? materialsMissing} />
        <PublicValue label={fr ? "Message aux participants" : "Message to participants"} value={info.participantMessage ?? missing} />
      </dl>
    </div>
  );
}

export function CataloguePracticalInformation({
  info,
  fr,
}: {
  info: PublicActionPracticalInformation;
  fr: boolean;
}) {
  const empty = fr ? "Aucune recommandation spécifique." : "No specific recommendation.";

  return (
    <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-800">
        <ShieldAlert size={15} aria-hidden="true" />
        {fr ? "Recommandations CleanMyMap" : "CleanMyMap recommendations"}
      </div>
      <dl className="space-y-3">
        <PublicList
          label={fr ? "Sécurité issue des déchets attendus" : "Safety from expected waste"}
          values={info.derivedSafetyRecommendations}
          empty={empty}
        />
        <PublicList
          label={fr ? "Matériel recommandé par le référentiel" : "Equipment recommended by the catalogue"}
          values={info.derivedMaterials}
          empty={empty}
        />
      </dl>
    </div>
  );
}
