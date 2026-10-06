import type {
  DomainFilter,
  PartnerKindFilter,
  TerritoryFilter,
} from "./partners-network-section.model";

type PartnersNetworkFilterSelectsProps = {
  fr: boolean;
  kindFilter: PartnerKindFilter;
  domainFilter: DomainFilter;
  zoneFilter: TerritoryFilter;
  onKindChange: (value: PartnerKindFilter) => void;
  onDomainChange: (value: DomainFilter) => void;
  onZoneChange: (value: TerritoryFilter) => void;
};

export function PartnersNetworkFilterSelects({
  fr,
  kindFilter,
  domainFilter,
  zoneFilter,
  onKindChange,
  onDomainChange,
  onZoneChange,
}: PartnersNetworkFilterSelectsProps) {
  return (
    <>
      <label className="space-y-2">
        <span className="cmm-text-small font-semibold text-slate-700">{fr ? "Type" : "Type"}</span>
        <select
          value={kindFilter}
          onChange={(event) => onKindChange(event.target.value as PartnerKindFilter)}
          className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
        >
          <option value="all">{fr ? "Tous" : "All"}</option>
          <option value="association">{fr ? "Associations" : "Associations"}</option>
          <option value="collective">{fr ? "Collectivités" : "Collectivities"}</option>
          <option value="company">{fr ? "Entreprises" : "Companies"}</option>
          <option value="institution">{fr ? "Institutions" : "Institutions"}</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="cmm-text-small font-semibold text-slate-700">
          {fr ? "Domaine d'action" : "Field of action"}
        </span>
        <select
          value={domainFilter}
          onChange={(event) => onDomainChange(event.target.value as DomainFilter)}
          className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
        >
          <option value="all">{fr ? "Tous" : "All"}</option>
          <option value="environnemental">{fr ? "Environnement" : "Environment"}</option>
          <option value="social">{fr ? "Social" : "Social"}</option>
          <option value="humanitaire">{fr ? "Humanitaire" : "Humanitarian"}</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="cmm-text-small font-semibold text-slate-700">
          {fr ? "Niveau territorial" : "Territorial level"}
        </span>
        <select
          value={zoneFilter}
          onChange={(event) => onZoneChange(event.target.value as TerritoryFilter)}
          className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
        >
          <option value="all">{fr ? "Toutes" : "All"}</option>
          <option value="france">{fr ? "France" : "National"}</option>
          <option value="region">{fr ? "Région" : "Region"}</option>
          <option value="departement">{fr ? "Département" : "Department"}</option>
          <option value="ville">{fr ? "Ville" : "City"}</option>
        </select>
      </label>
    </>
  );
}
