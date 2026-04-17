"use client";

import type { EventReminder } from "@/lib/community/engagement";

type CommunityRemindersCardProps = {
  reminders: EventReminder[];
  onCopyReminderMessage: (message: string) => Promise<void>;
};

function CommunityRemindersCard(props: CommunityRemindersCardProps) {
  const { reminders, onCopyReminderMessage } = props;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Relances prioritaires
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        Relances preconisees pour ameliorer la capacite evenement et la
        conversion RSVP.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {reminders.map((reminder) => (
          <li
            key={reminder.eventId}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Priorite {reminder.priority.toUpperCase()} - J-
                {reminder.daysToEvent}
              </p>
              <button
                onClick={() => void onCopyReminderMessage(reminder.message)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Copier message
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">{reminder.reason}</p>
            <p className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              {reminder.message}
            </p>
          </li>
        ))}
        {reminders.length === 0 ? (
          <li>Aucune relance urgente sur les 14 prochains jours.</li>
        ) : null}
      </ul>
    </div>
  );
}

export { CommunityRemindersCard };
