import { buildOfficialReportCss } from "./report-pdf-theme";

export function buildPdfChapterHeader(
  kicker: string,
  title: string,
  subtitle: string,
): string {
  return `
    <div style="margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px;">
      <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px;">${kicker}</div>
      <h2 style="font-family: 'Outfit'; font-size: 36px; font-weight: 700; color: #1e293b; margin: 0; letter-spacing: -0.02em;">${title}</h2>
      <p style="font-size: 14px; color: #64748b; margin-top: 8px; line-height: 1.5;">${subtitle}</p>
    </div>
  `;
}

export function buildPdfPrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
    ${buildOfficialReportCss()}
    @page { size: A4; margin: 0; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    .master-pack-container { background: #fff; }
    .report-cover { height: 297mm; width: 210mm; background: linear-gradient(135deg, #17303b, #1a365d); color: #FFFFFF; display: flex; flex-direction: column; padding: 80px; position: relative; overflow: hidden; page-break-after: always; }
    .report-cover::before { content: ""; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); opacity: 0.03; pointer-events: none; }
    .data-seal { position: absolute; top: 80px; right: 80px; width: 120px; height: 120px; }
    .section-title-print { font-family: 'Inter', sans-serif; font-size: 34px; font-weight: 750; color: #1A365D; margin-bottom: 24px; border-bottom: 2px solid #B8C8D0; display: inline-block; }
    .page-break { page-break-before: always; min-height: 297mm; box-sizing: border-box; }
    a { text-decoration: none; }
    @media print {
      .no-print { display: none !important; }
      .master-pack-container { width: 210mm; }
    }
  `;
}
