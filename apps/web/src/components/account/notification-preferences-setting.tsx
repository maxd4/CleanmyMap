"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/notification-preferences-client";
import type { Locale } from "@/lib/ui/preferences";

export function NotificationPreferencesSetting({ locale }: { locale: Locale }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"informational" | "reminders" | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadNotificationPreferences()
      .then((next) => {
        if (active) setPreferences(next);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggle(field: "informationalEnabled" | "actionRemindersEnabled") {
    const kind = field === "informationalEnabled" ? "informational" : "reminders";
    const nextValue = !preferences[field];
    setSaving(kind);
    setError(false);
    try {
      setPreferences(await updateNotificationPreferences({ [field]: nextValue }));
    } catch {
      setError(true);
    } finally {
      setSaving(null);
    }
  }

  const copy = locale === "fr"
    ? {
        title: "Notifications et rappels",
        description: "Les décisions à traiter et les alertes critiques restent toujours dans le centre de suivi.",
        informational: "Informations facultatives",
        informationalDescription: "Afficher les nouvelles opérationnelles, résultats et informations de suivi.",
        reminders: "Rappels J-1",
        remindersDescription: "Recevoir au maximum un rappel in-app la veille d’une action où votre inscription est confirmée.",
        unavailable: "Les préférences ne sont pas disponibles pour le moment.",
        saving: "Enregistrement…",
      }
    : {
        title: "Notifications and reminders",
        description: "Pending decisions and critical alerts always remain in the activity center.",
        informational: "Optional information",
        informationalDescription: "Show operational updates, results and follow-up information.",
        reminders: "J-1 reminders",
        remindersDescription: "Receive at most one in-app reminder the day before an action where you are confirmed.",
        unavailable: "Preferences are temporarily unavailable.",
        saving: "Saving…",
      };

  return (
    <section className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <h3 className="font-bold text-slate-900">{copy.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{copy.description}</p>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{copy.unavailable}</p> : null}
      <div className="mt-4 space-y-3">
        <PreferenceToggle
          checked={preferences.informationalEnabled}
          disabled={loading || saving !== null}
          label={copy.informational}
          description={copy.informationalDescription}
          saving={saving === "informational" ? copy.saving : null}
          onChange={() => void toggle("informationalEnabled")}
        />
        <PreferenceToggle
          checked={preferences.actionRemindersEnabled}
          disabled={loading || saving !== null}
          label={copy.reminders}
          description={copy.remindersDescription}
          saving={saving === "reminders" ? copy.saving : null}
          onChange={() => void toggle("actionRemindersEnabled")}
        />
      </div>
    </section>
  );
}

function PreferenceToggle({
  checked,
  disabled,
  label,
  description,
  saving,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  saving: string | null;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-100 bg-white/80 p-3 transition-colors hover:border-sky-200">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="mt-1 h-4 w-4 accent-sky-600" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-800">{saving ?? description}</span>
      </span>
    </label>
  );
}
