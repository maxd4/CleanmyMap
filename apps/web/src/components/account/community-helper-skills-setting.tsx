"use client";

import { useEffect, useState } from "react";

import { CmmButton } from "@/components/ui/cmm-button";
import {
  COMMUNITY_HELP_CATEGORIES,
  type CommunityHelpCategory,
} from "@/lib/community/action-needs";
import { isCommunityHelpCategory } from "@/lib/community/helper-skills";
import type { Locale } from "@/lib/ui/preferences";

const CATEGORY_LABELS: Record<CommunityHelpCategory, { fr: string; en: string }> = {
  materiel: { fr: "Matériel", en: "Equipment" },
  transport: { fr: "Transport", en: "Transport" },
  renfort_benevole: { fr: "Renfort bénévole", en: "Volunteer support" },
  communication: { fr: "Communication", en: "Communication" },
  photo_video: { fr: "Photo / vidéo", en: "Photo / video" },
  cartographie: { fr: "Cartographie", en: "Mapping" },
  expertise: { fr: "Expertise", en: "Expertise" },
  logistique: { fr: "Logistique", en: "Logistics" },
};

type SkillsResponse = { categories?: unknown };

export function CommunityHelperSkillsSetting({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const [categories, setCategories] = useState<CommunityHelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/community/helper-skills")
      .then(async (response) => {
        if (!response.ok) throw new Error("helper skills unavailable");
        return response.json() as Promise<SkillsResponse>;
      })
      .then((payload) => {
        const values = Array.isArray(payload.categories)
          ? payload.categories.filter(isCommunityHelpCategory)
          : [];
        if (active) setCategories([...new Set(values)]);
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

  function toggleCategory(category: CommunityHelpCategory) {
    setSaved(false);
    setCategories((current) => current.includes(category)
      ? current.filter((value) => value !== category)
      : [...current, category]);
  }

  async function save() {
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const response = await fetch("/api/community/helper-skills", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      if (!response.ok) throw new Error("helper skills update failed");
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const copy = fr
    ? {
        title: "Je peux aider pour…",
        description: "Choisissez les catégories pour lesquelles vous souhaitez voir des besoins suggérés. Cette préférence reste privée et facultative.",
        loading: "Chargement…",
        unavailable: "Les préférences d’aide ne sont pas disponibles pour le moment.",
        save: "Enregistrer",
        saving: "Enregistrement…",
        saved: "Préférences enregistrées.",
      }
    : {
        title: "I can help with…",
        description: "Choose the categories for which you want suggested needs. This preference is private and optional.",
        loading: "Loading…",
        unavailable: "Helper preferences are temporarily unavailable.",
        save: "Save",
        saving: "Saving…",
        saved: "Preferences saved.",
      };

  return (
    <section className="mt-5 rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4">
      <h3 className="font-bold text-slate-900">{copy.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{copy.description}</p>
      {loading ? <p className="mt-3 text-sm text-slate-700" role="status">{copy.loading}</p> : (
        <>
          <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">{copy.title}</legend>
            {COMMUNITY_HELP_CATEGORIES.map((category) => (
              <label key={category} className="flex items-start gap-2 rounded-xl border border-sky-200 bg-white p-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  disabled={saving}
                />
                <span>{CATEGORY_LABELS[category][fr ? "fr" : "en"]}</span>
              </label>
            ))}
          </fieldset>
          {error ? <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{copy.unavailable}</p> : null}
          {saved ? <p className="mt-3 text-sm font-semibold text-emerald-700" role="status">{copy.saved}</p> : null}
          <div className="mt-4"><CmmButton type="button" tone="secondary" variant="pill" disabled={saving} loading={saving} onClick={() => { void save(); }}>{saving ? copy.saving : copy.save}</CmmButton></div>
        </>
      )}
    </section>
  );
}
