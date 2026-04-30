"use client";

/**
 * VibrantBackground - Effets visuels premium
 * 
 * Mode exhaustif: Mesh gradients animés + grain + grid
 * Mode minimaliste/sobre: Masqué (via classe exhaustive-only)
 */

export function VibrantBackground() {
 return (
 <div className="fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(135deg,#2C5F77_0%,#356B73_24%,#417C84_48%,#2F80C3_76%,#5B5FCF_100%)]">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(39,195,217,0.20)_0%,transparent_28%),radial-gradient(circle_at_82%_12%,rgba(24,182,143,0.16)_0%,transparent_24%),radial-gradient(circle_at_52%_90%,rgba(91,95,207,0.16)_0%,transparent_34%)]" />

 {/* Texture très légère pour éviter le plat sans créer de bandes */}
 <div
 className="pointer-events-none absolute inset-0 opacity-[0.035] not-sober"
 style={{
 backgroundImage:
"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E\")",
 }}
 />

 {/* Vignette douce */}
 <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(44,95,119,0.18)_100%)]" />
 </div>
 );
}
