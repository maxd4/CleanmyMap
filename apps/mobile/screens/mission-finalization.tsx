import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { formatServerDistance, formatServerDuration } from '../lib/mission-summary'
import type { Mission, MissionFinalizationStage } from '../types/mission'

export function MissionFinalizationScreen({ stage }: { stage: MissionFinalizationStage }) {
  const isSynchronizing = stage === 'synchronizing'

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.eyebrow}>MISSION EN COURS DE FINALISATION</Text>
      <Text style={styles.title}>{isSynchronizing ? 'SYNCHRONISATION...' : 'FINALISATION SERVEUR...'}</Text>
      <View style={styles.steps}>
        <FinalizationStep label="Synchronisation GPS" complete={!isSynchronizing} active={isSynchronizing} />
        <FinalizationStep label="Finalisation serveur" complete={false} active={!isSynchronizing} />
      </View>
    </View>
  )
}

function FinalizationStep({ label, complete, active }: { label: string; complete: boolean; active: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, complete && styles.stepDotComplete, active && styles.stepDotActive]} />
      <Text style={[styles.stepText, (complete || active) && styles.stepTextActive]}>{label}</Text>
      <Text style={styles.stepStatus}>{complete ? 'OK' : active ? 'EN COURS' : 'À VENIR'}</Text>
    </View>
  )
}

export function MissionCompletionScreen({
  mission,
  onReturnHome,
}: {
  mission: Mission
  onReturnHome: () => void
}) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.eyebrow}>MISSION TERMINÉE</Text>
      <Text style={styles.title}>{mission.label}</Text>
      <Text style={styles.subtitle}>Le serveur a confirmé la finalisation de votre mission.</Text>

      <View style={styles.summary}>
        <SummaryRow label="DURÉE" value={formatServerDuration(mission.duration_s)} />
        <SummaryRow label="DISTANCE" value={formatServerDistance(mission.distance_m)} />
        <SummaryRow label="SYNCHRONISATION" value="Synchronisée avec le serveur" />
      </View>

      <TouchableOpacity style={styles.homeButton} onPress={onReturnHome}>
        <Text style={styles.homeButtonText}>REVENIR À L’ACCUEIL</Text>
      </TouchableOpacity>
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 28,
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  steps: {
    alignSelf: 'stretch',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 32,
    padding: 16,
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
  stepDot: {
    backgroundColor: '#475569',
    borderRadius: 5,
    height: 10,
    marginRight: 12,
    width: 10,
  },
  stepDotActive: { backgroundColor: '#fbbf24' },
  stepDotComplete: { backgroundColor: '#10b981' },
  stepText: { color: '#64748b', flex: 1, fontSize: 14, fontWeight: '700' },
  stepTextActive: { color: '#f8fafc' },
  stepStatus: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  summary: {
    alignSelf: 'stretch',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 32,
    paddingHorizontal: 16,
  },
  summaryRow: {
    alignItems: 'center',
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  summaryLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  summaryValue: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginLeft: 16, textAlign: 'right' },
  homeButton: {
    alignSelf: 'stretch',
    backgroundColor: '#10b981',
    borderRadius: 16,
    marginTop: 28,
    paddingVertical: 20,
  },
  homeButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
})
