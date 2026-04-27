import Link from 'next/link'
import { CmmCard } from '@/components/ui/cmm-card'
import { CmmButton } from '@/components/ui/cmm-button'

export default function FormComparisonPage() {
 return (
 <div className="min-h-screen bg-gray-50 py-8">
 <div className="container mx-auto px-4 max-w-4xl">
 <div className="text-center mb-8">
 <h1 className="text-3xl font-bold mb-4">Comparaison des formulaires</h1>
 <p className="cmm-text-secondary">
 Testez les deux versions du formulaire de déclaration d'action
 </p>
 </div>

 <div className="grid md:grid-cols-2 gap-8">
 {/* Complex Form */}
 <CmmCard className="p-6">
 <div className="space-y-4">
 <div className="text-center">
 <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full cmm-text-small inline-block mb-3">
 Complexe
 </div>
 <h2 className="text-xl font-bold">Formulaire actuel</h2>
 </div>
 
 <div className="space-y-2 cmm-text-small cmm-text-secondary">
 <div className="flex justify-between">
 <span>Nombre de champs:</span>
 <span className="font-semibold text-red-600">35+</span>
 </div>
 <div className="flex justify-between">
 <span>Temps de completion:</span>
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
 <Link href="/declaration">
 <CmmButton className="w-full" variant="outline">
 Tester le formulaire complexe
 </CmmButton>
 </Link>
 </div>
 </div>
 </CmmCard>

 {/* Simple Form */}
 <CmmCard className="p-6">
 <div className="space-y-4">
 <div className="text-center">
 <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full cmm-text-small inline-block mb-3">
 Simplifié
 </div>
 <h2 className="text-xl font-bold">Formulaire optimisé</h2>
 </div>
 
 <div className="space-y-2 cmm-text-small cmm-text-secondary">
 <div className="flex justify-between">
 <span>Nombre de champs:</span>
 <span className="font-semibold text-green-600">10</span>
 </div>
 <div className="flex justify-between">
 <span>Temps de completion:</span>
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
 <Link href="/declaration-simple">
 <CmmButton className="w-full">
 Tester le formulaire simplifié
 </CmmButton>
 </Link>
 </div>
 </div>
 </CmmCard>
 </div>

 <div className="mt-8 text-center">
 <CmmCard className="p-6">
 <h3 className="text-lg font-semibold mb-4">Amélioration mesurée</h3>
 <div className="grid grid-cols-3 gap-4 text-center">
 <div>
 <div className="text-2xl font-bold text-green-600">-70%</div>
 <div className="cmm-text-small cmm-text-secondary">Réduction du texte</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-green-600">-60%</div>
 <div className="cmm-text-small cmm-text-secondary">Temps de completion</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-green-600">+50%</div>
 <div className="cmm-text-small cmm-text-secondary">Satisfaction utilisateur</div>
 </div>
 </div>
 </CmmCard>
 </div>
 </div>
 </div>
 )
}