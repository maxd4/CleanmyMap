import type { CommunityEventItem } from "../http";
import type { EventReminder } from "./types";
import { parseEventDateMs, percent } from "./shared";

export function computeEventRelances(
  events: CommunityEventItem[],
  now: Date = new Date(),
): EventReminder[] {
  const nowMs = now.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const reminders: EventReminder[] = [];

  for (const event of events) {
    const eventMs = parseEventDateMs(event.eventDate);
    if (eventMs === null) {
      continue;
    }
    const daysToEvent = Math.floor((eventMs - nowMs) / DAY_MS);
    if (daysToEvent < 0 || daysToEvent > 14) {
      continue;
    }

    const yes = event.rsvpCounts.yes;
    const maybe = event.rsvpCounts.maybe;
    const fill = percent(yes, event.capacityTarget ?? 0);
    let priority: EventReminder["priority"] = "faible";
    let reason = "Maintenir le rythme de mobilisation.";

    if (daysToEvent <= 2 && (fill === null ? yes < 8 : fill < 85)) {
      priority = "haute";
      reason = "Evenement imminent avec remplissage insuffisant.";
    } else if (daysToEvent <= 5 && (fill === null ? yes < 10 : fill < 65)) {
      priority = "moyenne";
      reason = "Mobilisation a renforcer cette semaine.";
    } else if (daysToEvent <= 10 && maybe > yes) {
      priority = "moyenne";
      reason = "Beaucoup d'indecis: relance de confirmation necessaire.";
    } else if (fill !== null && fill < 80) {
      priority = "faible";
      reason = "Capacite non atteinte, relance preventive utile.";
    } else {
      continue;
    }

    const message =
      `Relance ${priority.toUpperCase()} - ${event.title} (${event.eventDate}) a ${event.locationLabel}. ` +
      `RSVP oui: ${yes}, maybe: ${maybe}${fill === null ? "" : `, remplissage: ${fill}%`}. ` +
      "Merci de confirmer votre presence et de partager a votre equipe.";

    reminders.push({
      eventId: event.id,
      priority,
      daysToEvent,
      reason,
      message,
    });
  }

  const priorityRank: Record<EventReminder["priority"], number> = {
    haute: 3,
    moyenne: 2,
    faible: 1,
  };
  return reminders.sort(
    (a, b) =>
      priorityRank[b.priority] - priorityRank[a.priority] ||
      a.daysToEvent - b.daysToEvent,
  );
}
