const WEATHER_LOCATION_STORAGE_KEY = "cmm.weather.selected-location";

export type StoredWeatherLocation = {
  label: string;
  subtitle: string;
};

function isStoredWeatherLocation(value: unknown): value is StoredWeatherLocation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredWeatherLocation>;
  return typeof candidate.label === "string" && typeof candidate.subtitle === "string";
}

export function sanitizeStoredWeatherLocation(value: unknown): StoredWeatherLocation | null {
  if (!isStoredWeatherLocation(value)) {
    return null;
  }

  const label = value.label.trim();
  const subtitle = value.subtitle.trim();
  if (!label || !subtitle) {
    return null;
  }

  return { label, subtitle };
}

export function readStoredWeatherLocation(): StoredWeatherLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    const location = sanitizeStoredWeatherLocation(parsed);
    if (!location) {
      return null;
    }

    if (raw !== JSON.stringify(location)) {
      window.localStorage.setItem(
        WEATHER_LOCATION_STORAGE_KEY,
        JSON.stringify(location),
      );
    }

    return location;
  } catch {
    return null;
  }
}

export function storeWeatherLocation(location: StoredWeatherLocation): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      WEATHER_LOCATION_STORAGE_KEY,
      JSON.stringify({
        label: location.label.trim(),
        subtitle: location.subtitle.trim(),
      }),
    );
  } catch {
    // Silent fallback: the weather screen still works without persistence.
  }
}
