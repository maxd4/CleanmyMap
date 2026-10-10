export type ActionDayBriefing = {
  status: "ok";
  actionId: string;
  access: "organizer" | "confirmed_volunteer";
  action: {
    status: "pending" | "approved" | "rejected" | "cancelled";
    publishedAt: string | null;
    actionPhase: "pre_action" | "post_action_draft" | "post_action_complete";
    title: string;
    actionDate: string;
    locationLabel: string;
    meetingPoint: string;
    meetingTime: string | null;
    eventStartTime: string | null;
    eventEndTime: string | null;
    organizerLabel: string;
    participantMessage: string | null;
    safetyInstructions: string | null;
    recommendedMaterials: string | null;
    materialsProvided: string | null;
    accessibility: string | null;
    accessibilityStatus: string;
    checklist: Array<{ key: string; label: string; checked: boolean }>;
    route: {
      topology: "loop" | "point_to_point" | null;
      departureLabel: string | null;
      arrivalLabel: string | null;
      hasSelectedOperationalRoute: boolean;
      targetDistanceKm: number | null;
      networkDistanceKm: number | null;
    };
    map: {
      latitude: number | null;
      longitude: number | null;
      geometrySource: string | null;
      hasGeometry: boolean;
    };
  };
};

export async function fetchActionDayBriefing(actionId: string): Promise<ActionDayBriefing> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/day`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as { error?: string } | ActionDayBriefing | null;
  if (!response.ok) throw new Error(body && "error" in body && body.error ? body.error : "Briefing indisponible.");
  if (!body || !("action" in body)) throw new Error("La réponse du briefing est incomplète.");
  return body as ActionDayBriefing;
}
