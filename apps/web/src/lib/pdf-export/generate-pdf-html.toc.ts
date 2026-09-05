import { MASTER_PACK_CHAPTERS } from "@/lib/reports/master-pack/constants";

export function buildPdfTableOfContents(): string {
  return `
    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Navigation</div>
    <h2 class="section-title-print" style="margin-top: 0;">Sommaire</h2>
    <p style="color: #475569; margin-bottom: 60px;">Ce rapport institutionnel est structuré en 7 parties clés pour un pilotage complet du territoire.</p>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      ${MASTER_PACK_CHAPTERS.filter(c => c.id !== "sommaire").map((chapter, i) => `
        <a href="#chapter-${chapter.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 0; border-bottom: 1px solid #f1f5f9; text-decoration: none; color: #1e293b;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 700; font-size: 16px; font-family: 'Outfit';">${i + 1}. ${chapter.title}</span>
            <span style="font-size: 12px; color: #64748b;">${chapter.subtitle}</span>
          </div>
          <span style="font-family: 'Outfit'; font-weight: 600; color: #10b981; font-size: 12px;">PAGE ${i + 3}</span>
        </a>
      `).join("")}
    </div>
  `;
}
