import type { ActionDayBriefing } from "@/lib/actions/day-briefing-http";

export function buildActionDayBriefingText(briefing: ActionDayBriefing): string {
 const action = briefing.action;
 const route = [action.route.departureLabel, action.route.arrivalLabel].filter(Boolean).join(" → ") ||
   (action.route.topology === "loop" ? "Boucle" : action.route.topology === "point_to_point" ? "Point à point" : "Lieu fixe");
 const lines = [
  action.title,
  `Date : ${action.actionDate}`,
  `Créneau : ${[action.meetingTime ?? action.eventStartTime, action.eventEndTime].filter(Boolean).join(" – ") || "À confirmer"}`,
  `Rendez-vous : ${action.meetingPoint}`,
  `Secteur : ${action.locationLabel}`,
  `Parcours : ${route}`,
  action.organizerLabel ? `Organisateur : ${action.organizerLabel}` : null,
  action.recommendedMaterials ? `À apporter : ${action.recommendedMaterials}` : null,
  action.materialsProvided ? `Fourni : ${action.materialsProvided}` : null,
  action.equipmentProvided?.length ? `Équipements déclarés : ${action.equipmentProvided.join(", ")}` : null,
  action.equipmentNotProvided?.length ? `Équipements non fournis : ${action.equipmentNotProvided.join(", ")}` : null,
  action.refreshmentsProvided?.length ? `Convivialité : ${action.refreshmentsProvided.join(", ")}` : null,
    action.volunteerChecklist?.toBring.length ? `Checklist — à apporter : ${action.volunteerChecklist.toBring.map((item) => item.label).join(", ")}` : null,
    action.volunteerChecklist?.weatherRecommendations.length ? `Checklist — météo : ${action.volunteerChecklist.weatherRecommendations.map((item) => item.label).join(", ")}` : action.volunteerChecklist?.weatherMessage ?? null,
    action.volunteerChecklist?.provided.length ? `Checklist — fourni : ${action.volunteerChecklist.provided.map((item) => item.label).join(", ")}` : null,
  action.safetyInstructions ? `Consignes : ${action.safetyInstructions}` : null,
  action.participantMessage ? `Informations pratiques : ${action.participantMessage}` : null,
  action.accessibility ? `Accessibilité : ${action.accessibility}` : null,
 ].filter((line): line is string => Boolean(line));
 return lines.join("\n");
}
