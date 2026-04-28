"use client";

import type { EventReminder } from"@/lib/community/engagement";

type CommunityRemindersCardProps = {
 reminders: EventReminder[];
 onCopyReminderMessage: (message: string) => Promise<void>;
};

function CommunityRemindersCard(props: CommunityRemindersCardProps) {
 const { reminders, onCopyReminderMessage } = props;

 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 Relances prioritaires
 </h2>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Relances preconisees pour ameliorer la capacite evenement et la
 conversion RSVP.
 </p>
 <ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
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
 className="rounded-lg border border-slate-300 bg-white px-2 py-1 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Copier message
 </button>
 </div>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">{reminder.reason}</p>
 <p className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 cmm-text-caption cmm-text-secondary">
 {reminder.message}
 </p>
 </li>
 ))}
      {reminders.length === 0 ? (
        <li className="cmm-text-secondary italic">Aucune relance urgente n'est nécessaire sur les 14 prochains jours.</li>
      ) : null}
 </ul>
 </div>
 );
}

export { CommunityRemindersCard };
