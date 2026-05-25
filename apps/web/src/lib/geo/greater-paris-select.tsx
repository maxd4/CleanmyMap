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
      <div className="flex rounded-2xl border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            setLocationType("arrondissement");
            onChange("");
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            locationType === "arrondissement"
              ? "bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)] text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.6)]"
              : "text-violet-100/70 hover:bg-white/[0.06] hover:text-white"
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
              ? "bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)] text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.6)]"
              : "text-violet-100/70 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Banlieue
        </button>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2.5 text-sm text-white shadow-none outline-none placeholder:text-violet-100/40 focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-violet-100/60 hover:bg-white/[0.06] hover:text-white"
          title="Rechercher une zone"
        >
          <Search size={18} />
        </button>
      </div>

      {isSearchOpen && (
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_50%,rgba(88,28,135,0.84)_100%)] p-3 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.6)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou département..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-violet-100/40 outline-none focus:border-emerald-300/30 focus:bg-white/[0.1] focus:ring-1 focus:ring-emerald-300/30"
            autoFocus
          />
          {searchQuery && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {filteredZones.length === 0 ? (
                <p className="p-2 text-xs text-violet-100/60">Aucune zone trouvée</p>
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
                      className="w-full rounded-xl px-2 py-1.5 text-left text-sm text-violet-100/78 hover:bg-white/[0.07] hover:text-white"
                    >
                      <span className="font-medium">{zone.label}</span>
                      <span className="ml-2 text-xs text-violet-100/50">
                        {zone.departmentName} ({zone.department})
                      </span>
                    </button>
                  ))}
                  {filteredZones.length > 10 && (
                    <p className="p-2 text-xs text-violet-100/60">
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
        <p className="text-xs text-violet-100/68">
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
