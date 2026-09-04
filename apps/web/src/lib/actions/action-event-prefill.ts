export type ActionEventPrefill = {
  locationLabel: string;
  latitude: number;
  longitude: number;
};

export function applyActionEventPrefill<T extends {
  locationLabel: string;
  departureLocationLabel: string;
  latitude: string;
  longitude: string;
}>(form: T, prefill: ActionEventPrefill | null | undefined): T {
  if (!prefill) {
    return form;
  }

  return {
    ...form,
    locationLabel: prefill.locationLabel,
    departureLocationLabel: prefill.locationLabel,
    latitude: String(prefill.latitude),
    longitude: String(prefill.longitude),
  };
}
