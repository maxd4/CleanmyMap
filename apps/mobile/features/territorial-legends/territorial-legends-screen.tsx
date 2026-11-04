import React, { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { MobileTerritorialLegendLevel, MobileTerritorialLegendOverviewTerritory, MobileTerritorialLegendReward } from './mobile-territorial-legends-service'
import type { TerritorialLegendsController } from './use-territorial-legends-controller'

type TerritorialLegendsScreenProps = {
  controller: TerritorialLegendsController
  onOpenPreferences: () => void
}

const LEVEL_LABELS: Record<MobileTerritorialLegendLevel, string> = {
  arrondissement: 'Arrondissement municipal',
  commune: 'Commune',
  department: 'Département ou équivalent',
  region: 'Région ou équivalent',
  country: 'France entière',
}

function levelLabel(level: string): string {
  return LEVEL_LABELS[level as MobileTerritorialLegendLevel] ?? level
}

function rewardLabel(reward: MobileTerritorialLegendReward): string {
  if (reward.awardKind === 'conquest') return 'Première conquête'
  if (reward.awardKind === 'season_end') return 'Fin de saison'
  return `${reward.thresholdDays} jours de détention`
}

function formatValue(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'Non disponible'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Non disponible' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

export function TerritorialLegendsScreen({ controller, onOpenPreferences }: TerritorialLegendsScreenProps) {
  const { overview, consent, overviewLoading, consentLoading, error, message, refresh } = controller
  const [rulesOpen, setRulesOpen] = useState(false)
  const [expandedTerritory, setExpandedTerritory] = useState<string | null>(null)

  if (overviewLoading && !overview) {
    return <View style={styles.state} testID="mobile-territorial-legends-loading"><ActivityIndicator color="#34d399" /><Text style={styles.helper}>Chargement des Légendes territoriales…</Text></View>
  }

  if (error && !overview) {
    return <View style={styles.state} testID="mobile-territorial-legends-error"><Text accessibilityRole="alert" style={styles.error}>{error}</Text><TouchableOpacity style={styles.primaryButton} onPress={() => void refresh()} accessibilityRole="button"><Text style={styles.primaryLabel}>Réessayer</Text></TouchableOpacity></View>
  }

  if (!overview) {
    return <View style={styles.state} testID="mobile-territorial-legends-empty"><Text style={styles.cardTitle}>Légendes territoriales</Text><Text style={styles.helper}>Les résultats territoriaux sont momentanément absents. Aucune donnée n’est inventée.</Text><TouchableOpacity style={styles.outlineButton} onPress={() => void refresh()} accessibilityRole="button"><Text style={styles.secondaryLabel}>Actualiser</Text></TouchableOpacity></View>
  }

  return <ScrollView contentContainerStyle={styles.root} testID="mobile-territorial-legends-screen">
    <Text style={styles.eyebrow}>PROGRESSION TERRITORIALE</Text>
    <Text style={styles.title}>Légendes territoriales</Text>
    <Text style={styles.body}>Les grades, classements, titres, récompenses et durées viennent exclusivement des contrats serveur CleanMyMap.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {message ? <Text style={styles.success}>{message}</Text> : null}

    <View style={styles.card}>
      <View style={styles.cardHeader}><Text style={styles.cardTitle}>Consentement territorial</Text><Text style={styles.serverStatus}>{consentLoading ? '…' : consent?.enabled ? 'Activé' : 'Désactivé'}</Text></View>
      <Text style={styles.helper}>{consent?.enabled ? 'Votre progression privée et votre participation publique suivent les règles serveur.' : 'Votre progression privée reste consultable. Vous n’êtes pas inscrit aux classements publics.'}</Text>
      <TouchableOpacity style={styles.outlineButton} onPress={onOpenPreferences} accessibilityRole="button"><Text style={styles.secondaryLabel}>Gérer dans Préférences</Text></TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.rulesButton} onPress={() => setRulesOpen((current) => !current)} accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }}><Text style={styles.rulesButtonLabel}>{rulesOpen ? 'Masquer les règles' : 'Ouvrir les règles'}</Text></TouchableOpacity>
    {rulesOpen ? <View style={styles.rulesCard} testID="mobile-territorial-legends-rules"><Text style={styles.ruleText}>Les cinq niveaux sont résolus par le serveur territorial officiel. La fenêtre de classement est de {overview.windowDays} jours, bornée par la campagne civile. Les égalités suivent le rang de compétition. Les cleanwalks non admissibles, les titres non confirmés et les données privées d’un tiers restent exclus.</Text></View> : null}

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cinq grades</Text>
      {overview.levels.length === 0 ? <Text style={styles.helper}>Grades non disponibles dans cette réponse partielle.</Text> : <View style={styles.gradeGrid}>{overview.levels.map((level) => <View key={level} style={styles.gradePill} testID={`mobile-territorial-grade-${level}`}><Text style={styles.gradeLabel}>{levelLabel(level)}</Text></View>)}</View>}
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Territoires concernés</Text>
      {overview.territories.length === 0 ? <Text style={styles.helper}>Aucune compétition territoriale disponible pour ce compte. Votre progression privée reste consultable sans consentement public.</Text> : overview.territories.map((territory) => <TerritoryCard key={`${territory.level}:${territory.territoryCode}`} territory={territory} windowDays={overview.windowDays} expanded={expandedTerritory === `${territory.level}:${territory.territoryCode}`} onToggleDetails={() => setExpandedTerritory((current) => current === `${territory.level}:${territory.territoryCode}` ? null : `${territory.level}:${territory.territoryCode}`)} />)}
    </View>
  </ScrollView>
}

function TerritoryCard({ territory, windowDays, expanded, onToggleDetails }: { territory: MobileTerritorialLegendOverviewTerritory; windowDays: number; expanded: boolean; onToggleDetails: () => void }) {
  const currentHold = territory.currentHold
  const bestHistory = territory.bestHistory
  const publicItems = territory.public?.items ?? []
  const rewards = territory.rewards ?? []
  return <View style={styles.territoryCard} testID={`mobile-territorial-territory-${territory.level}-${territory.territoryCode}`}>
    <Text style={styles.territoryLevel}>{levelLabel(territory.level)}</Text>
    <Text style={styles.territoryTitle}>{territory.territoryLabel ?? `Territoire ${territory.territoryCode}`}</Text>
    <Text style={styles.meta}>Titre obtenu : {territory.private?.title ?? 'Aucun titre confirmé'}</Text>
    <View style={styles.factGrid}>
      <Fact label="Rang" value={formatValue(territory.private?.rank)} />
      <Fact label="Cleanwalks admissibles" value={formatValue(territory.private?.distinctActions)} />
      <Fact label="Fenêtre" value={`${formatValue(windowDays)} jours`} />
      <Fact label="Détention actuelle" value={currentHold ? `${currentHold.days} j` : 'Non disponible'} />
      <Fact label="Meilleur historique" value={bestHistory ? `${bestHistory.days} j` : 'Non disponible'} />
    </View>

    <Text style={styles.subheading}>Classement autorisé</Text>
    {publicItems.length === 0 ? <Text style={styles.helper}>Aucun résultat public autorisé dans cette réponse.</Text> : publicItems.slice(0, 5).map((entry) => <View key={`${entry.rank}:${entry.publicLabel}`} style={styles.rankingRow}><Text style={styles.rankingLabel}>{entry.rank}. {entry.publicLabel}{entry.tied ? ` · égalité à ${entry.tieSize}` : ''}</Text><Text style={styles.rankingValue}>{entry.distinctActions} cleanwalk(s)</Text></View>)}

    <Text style={styles.subheading}>Récompenses confirmées</Text>
    {rewards.length === 0 ? <Text style={styles.helper}>Aucune récompense confirmée. Les paliers non confirmés ne sont pas inventés localement.</Text> : <View>{rewards.map((reward) => <View key={`${reward.awardKind}:${reward.thresholdDays}`} style={styles.badgeRow} testID={`mobile-territorial-reward-${reward.awardKind}-${reward.thresholdDays}`}><View style={styles.badgeMark}><Text style={styles.badgeMarkText}>✓</Text></View><View style={styles.badgeCopy}><Text style={styles.badgeLabel}>{rewardLabel(reward)}</Text><Text style={styles.badgeMeta}>{reward.validityStatus === 'active' ? 'Acquis' : 'Historique serveur'}</Text></View></View>)}</View>}

    <TouchableOpacity style={styles.detailsButton} onPress={onToggleDetails} accessibilityRole="button" accessibilityState={{ expanded }}><Text style={styles.detailsLabel}>{expanded ? 'Masquer les détails' : 'Ouvrir les détails du territoire'}</Text></TouchableOpacity>
    {expanded ? <View style={styles.detailsCard} testID={`mobile-territorial-details-${territory.territoryCode}`}><Text style={styles.ruleText}>Code territorial : {territory.territoryCode}</Text><Text style={styles.ruleText}>Campagne : {bestHistory?.campaignYear ?? 'Non disponible'}</Text><Text style={styles.ruleText}>Détention : {currentHold ? `${formatDate(currentHold.startedOn)} → ${formatDate(currentHold.lastVerifiedOn)}` : 'Non disponible'}</Text><Text style={styles.ruleText}>Le serveur reste la source des titres, rangs, égalités, récompenses et durées.</Text></View> : null}
  </View>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>
}

const styles = StyleSheet.create({
  root: { paddingBottom: 20 }, state: { alignItems: 'center', paddingVertical: 36 }, eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', marginBottom: 12 }, body: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 16 }, card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 16 }, cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { color: '#e2e8f0', flex: 1, fontSize: 17, fontWeight: '900', marginBottom: 10 }, serverStatus: { color: '#a7f3d0', fontSize: 12, fontWeight: '900' }, helper: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 8 }, error: { backgroundColor: '#451a1a', borderRadius: 10, color: '#fecaca', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, success: { backgroundColor: '#064e3b', borderRadius: 10, color: '#d1fae5', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, primaryButton: { alignItems: 'center', backgroundColor: '#34d399', borderRadius: 12, minHeight: 48, marginTop: 14, padding: 14 }, primaryLabel: { color: '#022c22', fontSize: 13, fontWeight: '900' }, outlineButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 10, borderWidth: 1, minHeight: 44, marginTop: 10, padding: 12 }, secondaryLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800', textAlign: 'center' }, rulesButton: { borderColor: '#334155', borderRadius: 12, borderWidth: 1, marginBottom: 14, minHeight: 44, padding: 12 }, rulesButtonLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '900', textAlign: 'center' }, rulesCard: { backgroundColor: '#111827', borderColor: '#334155', borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 14 }, ruleText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 5 }, gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, gradePill: { backgroundColor: '#064e3b', borderColor: '#34d399', borderRadius: 10, borderWidth: 1, minWidth: '46%', padding: 10 }, gradeLabel: { color: '#d1fae5', fontSize: 12, fontWeight: '800' }, territoryCard: { borderColor: '#334155', borderRadius: 14, borderWidth: 1, marginTop: 10, padding: 14 }, territoryLevel: { color: '#a7f3d0', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }, territoryTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900', marginTop: 5 }, meta: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 5 }, factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, fact: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 9, borderWidth: 1, flexGrow: 1, minWidth: '46%', padding: 9 }, factLabel: { color: '#94a3b8', fontSize: 11, lineHeight: 16 }, factValue: { color: '#f8fafc', fontSize: 13, fontWeight: '900', marginTop: 3 }, subheading: { color: '#d1fae5', fontSize: 13, fontWeight: '900', marginBottom: 6, marginTop: 16 }, rankingRow: { borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }, rankingLabel: { color: '#e2e8f0', flex: 1, fontSize: 12, fontWeight: '800', paddingRight: 8 }, rankingValue: { color: '#a7f3d0', fontSize: 12, fontWeight: '900' }, badgeRow: { alignItems: 'center', borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', paddingVertical: 9 }, badgeMark: { alignItems: 'center', backgroundColor: '#064e3b', borderColor: '#34d399', borderRadius: 16, borderWidth: 1, height: 30, justifyContent: 'center', marginRight: 10, width: 30 }, badgeMarkText: { color: '#d1fae5', fontSize: 15, fontWeight: '900' }, badgeCopy: { flex: 1 }, badgeLabel: { color: '#f8fafc', fontSize: 12, fontWeight: '800' }, badgeMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 }, detailsButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 10, borderWidth: 1, marginTop: 12, minHeight: 44, padding: 11 }, detailsLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '900' }, detailsCard: { backgroundColor: '#020617', borderRadius: 10, marginTop: 10, padding: 12 },
})
