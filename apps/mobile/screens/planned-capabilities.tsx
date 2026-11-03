import React from 'react'
import { ArrowLeft, Clock3 } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getPlannedCapability, type PlannedCapabilityId } from './planned-capabilities-contract'

export { PLANNED_CAPABILITIES, type PlannedCapabilityId } from './planned-capabilities-contract'

export function PlannedCapabilityMenu({ ids, onOpen }: { ids: PlannedCapabilityId[]; onOpen: (id: PlannedCapabilityId) => void }) {
  return <View style={styles.menu}>
    <Text style={styles.menuEyebrow}>À VENIR</Text>
    <Text style={styles.menuTitle}>Fonctionnalités en préparation</Text>
    {ids.map((id) => {
      const capability = getPlannedCapability(id)
      return <TouchableOpacity
        key={capability.id}
        style={styles.menuItem}
        onPress={() => onOpen(capability.id)}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${capability.title}`}
        accessibilityHint="Ouvre une page d'information statique"
      >
        <View style={styles.menuIcon}><Clock3 size={18} color="#a7f3d0" /></View>
        <View style={styles.menuCopy}>
          <Text style={styles.menuItemTitle}>{capability.title}</Text>
          <Text style={styles.menuItemSubtitle}>{capability.subtitle}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    })}
  </View>
}

export function PlannedCapabilityScreen({ id, onBack }: { id: PlannedCapabilityId; onBack: () => void }) {
  const capability = getPlannedCapability(id)
  return <View style={styles.screen}>
    <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour à la surface précédente">
      <ArrowLeft size={18} color="#a7f3d0" />
      <Text style={styles.backLabel}>Retour</Text>
    </TouchableOpacity>
    <Text style={styles.eyebrow}>PLAN MOBILE</Text>
    <Text accessibilityRole="header" style={styles.title}>{capability.title}</Text>
    <Text style={styles.subtitle}>{capability.subtitle}</Text>
    <View style={styles.separator} />
    <Text style={styles.description}>{capability.description}</Text>
    <View style={styles.statusCard} accessibilityRole="text">
      <Clock3 size={22} color="#34d399" />
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>En préparation</Text>
        <Text style={styles.statusDescription}>Cette page présente une évolution différée. Aucun parcours métier n’est disponible ici.</Text>
      </View>
    </View>
  </View>
}

const styles = StyleSheet.create({
  menu: { marginTop: 28 },
  menuEyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  menuTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  menuItem: { alignItems: 'center', borderColor: '#334155', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, minHeight: 58, paddingHorizontal: 12, paddingVertical: 10 },
  menuIcon: { alignItems: 'center', backgroundColor: '#064e3b', borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  menuCopy: { flex: 1, minWidth: 0 },
  menuItemTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '900' },
  menuItemSubtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 3 },
  chevron: { color: '#34d399', fontSize: 25, fontWeight: '300', marginLeft: 4 },
  screen: { paddingBottom: 18 },
  backButton: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 44, paddingVertical: 10, marginBottom: 18 },
  backLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800' },
  eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { color: '#cbd5e1', fontSize: 17, lineHeight: 24, marginBottom: 18 },
  separator: { backgroundColor: '#1e293b', height: 1, marginBottom: 22 },
  description: { color: '#cbd5e1', fontSize: 15, lineHeight: 23 },
  statusCard: { alignItems: 'flex-start', backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 26, padding: 16 },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#d1fae5', fontSize: 14, fontWeight: '900', marginBottom: 5 },
  statusDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
})
