import { PackageCheck } from "lucide-react";
import type { PublicActionPracticalInformation } from "@/lib/actions/participation/group-participation";
import {
  CataloguePracticalInformation,
  OrganizerPracticalInformation,
} from "./rejoindre-un-formulaire-section.practical-info-panels";

export function ActionPracticalInformation({
  info,
  fr,
}: {
  info: PublicActionPracticalInformation;
  fr: boolean;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4" aria-label={fr ? "Informations pratiques" : "Practical information"}>
      <div className="mb-3 flex items-center gap-2">
        <PackageCheck size={17} className="text-emerald-700" aria-hidden="true" />
        <h4 className="text-sm font-black text-emerald-950">{fr ? "Informations pratiques" : "Practical information"}</h4>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <OrganizerPracticalInformation info={info} fr={fr} />
        <CataloguePracticalInformation info={info} fr={fr} />
      </div>
    </section>
  );
}
