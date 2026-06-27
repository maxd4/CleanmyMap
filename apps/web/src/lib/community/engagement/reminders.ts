import type { CommunityEventItem } from "../http";
import type { EventReminder } from "./types";
import { parseEventDateMs, percent } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function getReminderDecision(
  daysToEvent: number,
  yes: number,
  maybe: number,
  fill: number | null,
): { priority: EventReminder["priority"]; reason: string } | null {
  if (daysToEvent <= 2 && (fill === null ? yes < 8 : fill < 85)) {
    return {
      priority: "haute",
      reason: "Evenement imminent avec remplissage insuffisant.",
    };
  }

  if (daysToEvent <= 5 && (fill === null ? yes < 10 : fill < 65)) {
    return {
      priority: "moyenne",
      reason: "Mobilisation a renforcer cette semaine.",
    };
  }

  if (daysToEvent <= 10 && maybe > yes) {
    return {
      priority: "moyenne",
      reason: "Beaucoup d'indecis: relance de confirmation necessaire.",
    };
  }

  if (fill !== null && fill < 80) {
    return {
      priority: "faible",
      reason: "Capacite non atteinte, relance preventive utile.",
    };
  }

  return null;
}

function buildReminderMessage(
  event: CommunityEventItem,
  priority: EventReminder["priority"],
  yes: number,
  maybe: number,
  fill: number | null,
): string {
  return (
    `Relance ${priority.toUpperCase()} - ${event.title} (${event.eventDate}) a ${event.locationLabel}. ` +
    `RSVP oui: ${yes}, maybe: ${maybe}${fill === null ? "" : `, remplissage: ${fill}%`}. ` +
    "Merci de confirmer votre presence et de partager a votre equipe."
  );
}

export function computeEventRelances(
  events: CommunityEventItem[],
  now: Date = new Date(),
): EventReminder[] {
  const nowMs = now.getTime();
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
    const decision = getReminderDecision(daysToEvent, yes, maybe, fill);
    if (!decision) {
      continue;
    }

    reminders.push({
      eventId: event.id,
      priority: decision.priority,
      daysToEvent,
      reason: decision.reason,
      message: buildReminderMessage(event, decision.priority, yes, maybe, fill),
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
