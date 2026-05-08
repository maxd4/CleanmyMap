import React from "react";

export function ContactSection({
  contactName,
  setContactName,
  setContactNameTouched,
  contactChannel,
  setContactChannel,
  contactDetails,
  setContactDetails,
  setContactDetailsTouched,
}: {
  contactName: string;
  setContactName: (v: string) => void;
  setContactNameTouched: (v: boolean) => void;
  contactChannel: string;
  setContactChannel: (v: string) => void;
  contactDetails: string;
  setContactDetails: (v: string) => void;
  setContactDetailsTouched: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="space-y-1 md:col-span-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Contact</span>
        <input
          required
          value={contactName}
          onChange={(event) => {
            setContactNameTouched(true);
            setContactName(event.target.value);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>
      <label className="space-y-1 md:col-span-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Canal de contact</span>
        <input
          required
          value={contactChannel}
          onChange={(event) => setContactChannel(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>
      <label className="space-y-1 md:col-span-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Coordonnée joignable</span>
        <input
          required
          value={contactDetails}
          onChange={(event) => {
            setContactDetailsTouched(true);
            setContactDetails(event.target.value);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>
    </div>
  );
}
