import type { Metadata } from "next";
import Link from 'next/link'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Comparaison interne des formulaires - CleanMyMap",
  description:
    "Vue interne de comparaison entre les formulaires de déclaration, réservée aux comptes connectés.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FormComparisonPage() {
 return (
 <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.45)_0%,_rgba(255,255,255,0.96)_52%,_rgba(248,250,252,1)_100%)] py-8">
 <div className="container mx-auto max-w-4xl px-4">
 <PageHeader
   tone="sky"
   align="center"
   badge={<PageHeaderBadge tone="sky">Vue interne</PageHeaderBadge>}
   title="Comparer les formulaires"
   subtitle="Comparez la version actuelle et la version simplifiée du formulaire de déclaration."
   className="mb-8"
 />

 <div className="grid md:grid-cols-2 gap-8">
  {/* Complex Form */}
 <CmmCard tone="sky" variant="elevated" className="p-6">
 <div className="space-y-4">
 <div className="text-center">
 <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full cmm-text-small inline-block mb-3">
 Complexe
 </div>
 <h2 className="text-xl font-bold">Version actuelle</h2>
 </div>
 
 <div className="space-y-2 cmm-text-small cmm-text-secondary">
 <div className="flex justify-between">
 <span>Nombre de champs:</span>
 <span className="font-semibold text-red-600">35+</span>
 </div>
 <div className="flex justify-between">
 <span>Temps de saisie:</span>
 <span className="font-semibold text-red-600">15-20 min</span>
 </div>
 <div className="flex justify-between">
 <span>Sections:</span>
 <span className="font-semibold">7</span>
 </div>
 <div className="flex justify-between">
 <span>Lignes de code:</span>
 <span className="font-semibold text-red-600">1000+</span>
 </div>
 </div>

 <div className="pt-4">
 <Link href="/actions/new" prefetch={false}>
        <CmmButton className="w-full" tone="secondary">
 Tester le formulaire complexe
 </CmmButton>
 </Link>
 </div>
 </div>
 </CmmCard>

 {/* Simple Form */}
 <CmmCard tone="sky" variant="elevated" className="p-6">
 <div className="space-y-4">
 <div className="text-center">
 <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full cmm-text-small inline-block mb-3">
 Simplifié
 </div>
 <h2 className="text-xl font-bold">Version simplifiée</h2>
 </div>
 
 <div className="space-y-2 cmm-text-small cmm-text-secondary">
 <div className="flex justify-between">
 <span>Nombre de champs:</span>
 <span className="font-semibold text-green-600">10</span>
 </div>
 <div className="flex justify-between">
 <span>Temps de saisie:</span>
 <span className="font-semibold text-green-600">3-5 min</span>
 </div>
 <div className="flex justify-between">
 <span>Sections:</span>
 <span className="font-semibold">1</span>
 </div>
 <div className="flex justify-between">
 <span>Lignes de code:</span>
 <span className="font-semibold text-green-600">300</span>
 </div>
 </div>

 <div className="pt-4">
 <Link href="/actions/new" prefetch={false}>
 <CmmButton className="w-full" tone="primary">
 Tester le formulaire simplifié
 </CmmButton>
 </Link>
 </div>
 </div>
 </CmmCard>
 </div>

 <div className="mt-8 text-center">
 <CmmCard tone="sky" variant="elevated" className="p-6">
 <h3 className="mb-4 text-lg font-semibold text-slate-900">Gain mesuré</h3>
 <div className="grid grid-cols-3 gap-4 text-center">
 <div>
 <div className="text-2xl font-bold text-green-600">-70%</div>
 <div className="cmm-text-small cmm-text-secondary">Texte réduit</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-green-600">-60%</div>
 <div className="cmm-text-small cmm-text-secondary">Temps de saisie</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-green-600">+50%</div>
 <div className="cmm-text-small cmm-text-secondary">Satisfaction</div>
 </div>
 </div>
 </CmmCard>
 </div>
 </div>
 </div>
 )
}
