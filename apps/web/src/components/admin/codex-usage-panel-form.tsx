import type { ChangeEvent } from "react";
import type { CodexUsageFormField, CodexUsageFormState } from "./codex-usage-panel.model";

const FIELDS: ReadonlyArray<{ key: Exclude<CodexUsageFormField, "source" | "notes">; label: string; type: "date" | "number" }> = [
  { key: "weekStart", label: "Début semaine", type: "date" },
  { key: "weekEnd", label: "Fin semaine", type: "date" },
  { key: "sessionCount", label: "Sessions", type: "number" },
  { key: "conversationCount", label: "Conversations", type: "number" },
  { key: "turnCount", label: "Tours", type: "number" },
  { key: "toolCallCount", label: "Actions outillées", type: "number" },
  { key: "shellCommandCount", label: "Commandes shell", type: "number" },
  { key: "fileTouchCount", label: "Fichiers touchés", type: "number" },
  { key: "testRunCount", label: "Tests", type: "number" },
  { key: "changedLineCount", label: "Lignes modifiées", type: "number" },
  { key: "activeMinutes", label: "Minutes actives", type: "number" },
];

const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-white/20";
const LABEL_CLASS = "rounded-3xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-white";

type CodexUsagePanelFormProps = {
  form: CodexUsageFormState;
  onChange: (field: CodexUsageFormField, value: string) => void;
};

function handleChange(
  onChange: CodexUsagePanelFormProps["onChange"],
  field: CodexUsageFormField,
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) {
  onChange(field, event.target.value);
}

export function CodexUsagePanelForm({ form, onChange }: CodexUsagePanelFormProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {FIELDS.map(({ key, label, type }) => (
          <label key={key} className={LABEL_CLASS}>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/30">
              {label}
            </span>
            <input
              type={type}
              min={type === "number" ? 0 : undefined}
              value={form[key]}
              onChange={(event) => handleChange(onChange, key, event)}
              className={INPUT_CLASS}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className={LABEL_CLASS}>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/30">
            Source de la semaine
          </span>
          <select
            value={form.source}
            onChange={(event) => handleChange(onChange, "source", event)}
            className={INPUT_CLASS}
          >
            <option value="manual">Manual</option>
            <option value="imported">Imported</option>
            <option value="reconstructed">Reconstructed</option>
          </select>
        </label>
        <label className={LABEL_CLASS}>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/30">
            Notes
          </span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => handleChange(onChange, "notes", event)}
            placeholder="Une note par ligne"
            className={INPUT_CLASS}
          />
        </label>
      </div>
    </>
  );
}
