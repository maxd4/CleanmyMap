export function ContactSection({
  contactName,
  setContactName,
  setContactNameTouched,
  contactChannel,
  setContactChannel,
  contactDetails,
  setContactDetails,
  setContactDetailsTouched,
  publicWebsiteUrl,
  setPublicWebsiteUrl,
  publicWebsiteConsent,
  setPublicWebsiteConsent,
}: {
  contactName: string;
  setContactName: (v: string) => void;
  setContactNameTouched: (v: boolean) => void;
  contactChannel: string;
  setContactChannel: (v: string) => void;
  contactDetails: string;
  setContactDetails: (v: string) => void;
  setContactDetailsTouched: (v: boolean) => void;
  publicWebsiteUrl: string;
  setPublicWebsiteUrl: (v: string) => void;
  publicWebsiteConsent: boolean;
  setPublicWebsiteConsent: (v: boolean) => void;
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
      <div className="space-y-2 md:col-span-3">
        <label className="block space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            Site web public de la structure (facultatif)
          </span>
          <input
            type="url"
            value={publicWebsiteUrl}
            onChange={(event) => setPublicWebsiteUrl(event.target.value)}
            placeholder="https://www.votre-structure.fr"
            inputMode="url"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
          />
        </label>
        <label className="flex items-start gap-2 cmm-text-small cmm-text-secondary">
          <input
            type="checkbox"
            checked={publicWebsiteConsent}
            onChange={(event) => setPublicWebsiteConsent(event.target.checked)}
            className="mt-1"
          />
          <span>
            J’autorise la publication de ce site web dans la fiche Annuaire après validation.
          </span>
        </label>
        <p className="cmm-text-caption cmm-text-muted">
          Les coordonnées administratives ci-dessus restent privées et ne remplacent jamais ce site public.
        </p>
      </div>
    </div>
  );
}
