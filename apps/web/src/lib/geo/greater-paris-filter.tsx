"use client";

import { useMemo, useState } from "react";
import {
  ALL_ZONES,
  ALL_DEPARTMENTS,
  getZonesByAreaType,
  type AreaType,
} from "./greater-paris";

export interface ZoneFilterOption {
  value: string;
  label: string;
  department: string;
  areaType: AreaType;
  group: string;
}

export function useZoneFilters() {
  const [selectedAreaType, setSelectedAreaType] = useState<AreaType | "all">("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string | "all">("all");

  const filters = useMemo(() => {
    const groups: ZoneFilterOption[] = [];

    if (selectedAreaType === "all") {
      for (const dept of ALL_DEPARTMENTS) {
        const deptZones = ALL_ZONES.filter((z) => z.department === dept.code);
        for (const zone of deptZones) {
          groups.push({
            value: zone.name,
            label: zone.name,
            department: zone.department,
            areaType: zone.areaType,
            group: `${dept.name} (${dept.code})`,
          });
        }
      }
    } else {
      const zones = getZonesByAreaType(selectedAreaType);
      for (const zone of zones) {
        const dept = ALL_DEPARTMENTS.find((d) => d.code === zone.department);
        groups.push({
          value: zone.name,
          label: zone.name,
          department: zone.department,
          areaType: zone.areaType,
          group: dept?.name ?? zone.department,
        });
      }
    }

    return groups;
  }, [selectedAreaType]);

  const groupedFilters = useMemo(() => {
    const groups: Record<string, ZoneFilterOption[]> = {};
    for (const filter of filters) {
      if (!groups[filter.group]) {
        groups[filter.group] = [];
      }
      groups[filter.group].push(filter);
    }
    return groups;
  }, [filters]);

  const departments = useMemo(() => {
    return ALL_DEPARTMENTS.map((d) => ({
      value: d.code,
      label: `${d.name} (${d.code})`,
    }));
  }, []);

  const areaTypes: { value: AreaType | "all"; label: string }[] = [
    { value: "all", label: "Toutes les zones" },
    { value: "paris", label: "Paris intra-muros" },
    { value: "petite_couronne", label: "Petite couronne" },
    { value: "grande_couronne", label: "Grande couronne" },
  ];

  return {
    filters,
    groupedFilters,
    departments,
    areaTypes,
    selectedAreaType,
    setSelectedAreaType,
    selectedDepartment,
    setSelectedDepartment,
  };
}

export function ZoneFilterSelect({
  value,
  onChange,
  placeholder = "Filtrer par zone...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const {
    groupedFilters,
    areaTypes,
    selectedAreaType,
    setSelectedAreaType,
  } = useZoneFilters();

  return (
    <div className="space-y-2">
      <select
        value={selectedAreaType}
        onChange={(e) => setSelectedAreaType(e.target.value as AreaType | "all")}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        {areaTypes.map((at) => (
          <option key={at.value} value={at.value}>
            {at.label}
          </option>
        ))}
      </select>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {Object.entries(groupedFilters).map(([group, options]) => (
          <optgroup key={group} label={group}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
