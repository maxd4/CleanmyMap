export function buildPdfCover(
  organizationName: string,
  selectedOrg: string,
  deliverableId: string,
): string {
  return `
    <div class="data-seal">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="2 2" />
        <circle cx="50" cy="50" r="38" fill="#10b981" fill-opacity="0.1" />
        <text x="50" y="45" text-anchor="middle" font-family="Inter" font-size="8" fill="#10b981" font-weight="bold">DONNÉES</text>
        <text x="50" y="55" text-anchor="middle" font-family="Inter" font-size="12" fill="#FFFFFF" font-weight="bold">CMM</text>
        <text x="50" y="65" text-anchor="middle" font-family="monospace" font-size="6" fill="#10b981">SOURCE CMM</text>
      </svg>
    </div>
    <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
      <div style="font-family: monospace; font-size: 10px; color: #475569; letter-spacing: 0.2em; margin-bottom: 20px;">LIVRABLE OFFICIEL #${deliverableId}</div>
      <h1 style="font-family: 'Inter'; font-size: 48px; font-weight: 750; color: #FFFFFF; margin: 0;">Master Pack</h1>
      <h2 style="font-family: 'Inter'; font-size: 26px; font-weight: 500; color: #cbd5e1; margin: 8px 0 0 0;">Rapport d'impact institutionnel</h2>
      <div style="margin-top: 60px; padding: 20px; border-left: 4px solid #10b981; background: rgba(255,255,255,0.03);">
        <div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Périmètre d'Analyse</div>
        <div style="font-size: 24px; color: #FFFFFF; margin-top: 8px; font-family: 'Outfit';">${organizationName}</div>
        <div style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Période Annuelle ${new Date().getFullYear()}</div>
      </div>
    </div>
    ${"    "}
    <div style="background: rgba(255,255,255,0.05); padding: 24px; border-radius: 16px; display: flex; align-items: center; gap: 24px; margin-top: 40px;">
      <div style="width: 100px; height: 100px; background: white; padding: 8px; border-radius: 12px;">
         <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://cleanmymap.com/reports?org=${encodeURIComponent(selectedOrg || "")}" style="width: 100%; height: 100%;" />
      </div>
      <div>
        <div style="font-weight: 600; font-size: 16px; color: #FFFFFF; font-family: 'Outfit';">Accès rapports d&apos;impact</div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 4px; line-height: 1.5;">Scannez pour consulter les synthèses, les preuves spatiales et les certificats d'action détaillés sur la plateforme CleanMyMap.</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; margin-top: 60px;">
      <div>
        <div style="font-weight: 600; font-size: 20px; font-family: 'Outfit';">CleanMyMap</div>
        <div style="color: #64748b; font-size: 12px;">Intelligence Environnementale Territoriale</div>
      </div>
      <div style="text-align: right; color: #64748b; font-size: 12px;">
        Document généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}
      </div>
    </div>
  `;
}
