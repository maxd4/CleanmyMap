"use client";

import { useMemo, useState } from "react";
import {
  ALL_ZONES,
  getZonesByAreaType,
  type AreaType,
} from "./greater-paris";
import { Search } from "lucide-react";

export type { AreaType };

export interface ZoneOption {
  value: string;
  label: string;
  department: string;
  departmentName: string;
  areaType: AreaType;
}

type LocationType = "arrondissement" | "banlieue";

export function useGreaterParisZones() {
  const zones = useMemo<ZoneOption[]>(() => {
    return ALL_ZONES.map((z) => ({
      value: z.name,
      label: z.name,
      department: z.department,
      departmentName: z.departmentName,
      areaType: z.areaType,
    }));
  }, []);

  const zonesByAreaType = useMemo(() => {
    return {
      paris: getZonesByAreaType("paris").map((z) => ({
        value: z.name,
        label: z.name,
        department: z.department,
        departmentName: z.departmentName,
        areaType: z.areaType,
      })),
      petite_couronne: getZonesByAreaType("petite_couronne").map((z) => ({
        value: z.name,
        label: z.name,
        department: z.department,
        departmentName: z.departmentName,
        areaType: z.areaType,
      })),
      grande_couronne: getZonesByAreaType("grande_couronne").map((z) => ({
        value: z.name,
        label: z.name,
        department: z.department,
        departmentName: z.departmentName,
        areaType: z.areaType,
      })),
    };
  }, []);

  return { zones, zonesByAreaType };
}

export function GreaterParisLocationSelector({
  value,
  onChange,
  placeholder = "Sélectionnez une zone...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { zones, zonesByAreaType } = useGreaterParisZones();
  const [locationType, setLocationType] = useState<LocationType>(
    value && zones.find((z) => z.value === value)?.areaType === "paris"
      ? "arrondissement"
      : "banlieue"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentZones = useMemo(() => {
    if (locationType === "arrondissement") {
      return zonesByAreaType.paris;
    }
    return [...zonesByAreaType.petite_couronne, ...zonesByAreaType.grande_couronne];
  }, [locationType, zonesByAreaType]);

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return currentZones;
    const query = searchQuery.toLowerCase();
    return currentZones.filter(
      (z) =>
        z.label.toLowerCase().includes(query) ||
        z.departmentName.toLowerCase().includes(query) ||
        z.department.includes(query)
    );
  }, [searchQuery, currentZones]);

  const selectedZone = zones.find((z) => z.value === value);

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-slate-200 p-1">
        <button
          type="button"
          onClick={() => {
            setLocationType("arrondissement");
            onChange("");
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            locationType === "arrondissement"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Arrondissement
        </button>
        <button
          type="button"
          onClick={() => {
            setLocationType("banlieue");
            onChange("");
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            locationType === "banlieue"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Banlieue
        </button>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">{placeholder}</option>
          {filteredZones.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label} ({zone.department})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Rechercher une zone"
        >
          <Search size={18} />
        </button>
      </div>

      {isSearchOpen && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou département..."
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {filteredZones.length === 0 ? (
                <p className="p-2 text-xs text-slate-400">Aucune zone trouvée</p>
              ) : (
                <div className="space-y-1">
                  {filteredZones.slice(0, 10).map((zone) => (
                    <button
                      key={zone.value}
                      type="button"
                      onClick={() => {
                        onChange(zone.value);
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                      className="w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-emerald-50"
                    >
                      <span className="font-medium">{zone.label}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {zone.departmentName} ({zone.department})
                      </span>
                    </button>
                  ))}
                  {filteredZones.length > 10 && (
                    <p className="p-2 text-xs text-slate-400">
                      ... et {filteredZones.length - 10} autres
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedZone && (
        <p className="text-xs text-slate-500">
          Zone sélectionnée : <span className="font-medium">{selectedZone.label}</span>
          <span className="ml-1">({selectedZone.departmentName})</span>
        </p>
      )}
    </div>
  );
}

export function GreaterParisSelect({
  value,
  onChange,
  placeholder = "Sélectionnez une zone...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <GreaterParisLocationSelector
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}