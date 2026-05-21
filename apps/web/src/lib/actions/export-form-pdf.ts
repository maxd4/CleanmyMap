import type { FormState } from "@/components/actions/action-declaration-form.model";

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;width:40%">${esc(label)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:500">${esc(value)}</td>
    </tr>`;
}

function section(title: string, rows: string): string {
  if (!rows.trim()) return "";
  return `
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#10b981;margin-bottom:8px">${esc(title)}</div>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function exportFormAsPdf(form: FormState, actorName: string): boolean {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;

  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const identityRows =
    row("Déclarant", actorName) +
    row("Date de l'action", form.actionDate) +
    row("Association", form.associationName) +
    row("Bénévoles", form.volunteersCount ? `${form.volunteersCount} personne(s)` : "") +
    row("Durée", form.durationMinutes ? `${form.durationMinutes} min` : "");

  const harvestRows =
    row("Déchets collectés", form.wasteKg ? `${form.wasteKg} kg` : "") +
    row("Mégots", form.wasteMegotsKg ? `${form.wasteMegotsKg} kg` : "") +
    row("Type de lieu", form.placeType);

  const locationRows =
    row("Lieu", form.locationLabel) +
    row("Départ", form.departureLocationLabel) +
    row("Arrivée", form.arrivalLocationLabel) +
    row("Latitude", form.latitude) +
    row("Longitude", form.longitude);

  const notesRows = row("Notes", form.notes ?? "");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Déclaration CleanMyMap</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @page { size: A4; margin: 20mm 18mm; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table tr:not(:last-child) td { border-bottom: 1px solid #e2e8f0; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #10b981">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#10b981;margin-bottom:6px">CleanMyMap</div>
      <h1 style="font-size:26px;font-weight:700;margin:0;color:#0f172a">Déclaration d'action</h1>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0">Généré le ${esc(date)}</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8;font-family:monospace">
      CMM-FORM-${Math.random().toString(36).substring(2, 8).toUpperCase()}
    </div>
  </div>

  ${section("Identité & Organisation", identityRows)}
  ${section("Récolte", harvestRows)}
  ${section("Localisation", locationRows)}
  ${section("Notes", notesRows)}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between">
    <span>CleanMyMap — Plateforme citoyenne de dépollution</span>
    <span>Document non contractuel</span>
  </div>

  <script>
    window.addEventListener("load", () => setTimeout(() => { window.print(); }, 600));
    window.addEventListener("afterprint", () => window.close());
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
