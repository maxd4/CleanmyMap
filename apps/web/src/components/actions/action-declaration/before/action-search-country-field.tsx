"use client";

import { CmmField, CmmSelect } from "@/components/ui/cmm-field";
import {
  DEFAULT_COUNTRY_CODE,
  ISO_3166_ALPHA_2_CODES,
  parseCountryCode,
  type CountryCode,
} from "@/lib/user-location-preference";

function countryLabel(countryCode: CountryCode): string {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function ActionSearchCountryField({
  countryCode = DEFAULT_COUNTRY_CODE,
  onChange,
}: {
  countryCode?: CountryCode;
  onChange: (countryCode: CountryCode) => void;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 p-4">
      <CmmField
        id="action-search-country"
        label="Pays de recherche des adresses"
        hint="Prérempli depuis votre préférence territoriale. Ce choix concerne uniquement les suggestions et ne modifie pas votre profil."
      >
        <CmmSelect
          value={countryCode}
          onChange={(event) => {
            const nextCountry = parseCountryCode(event.target.value);
            if (nextCountry) onChange(nextCountry);
          }}
        >
          {ISO_3166_ALPHA_2_CODES.map((code) => (
            <option key={code} value={code}>
              {countryLabel(code)} ({code})
            </option>
          ))}
        </CmmSelect>
      </CmmField>
    </div>
  );
}
