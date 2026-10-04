import React, { useEffect, useState } from 'react'
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getDialablePhone, hasEmergencyContact } from '../lib/emergency-contact'
import { getStoredEmergencyContact } from '../lib/storage'
import type { EmergencyContact } from '../types/emergency-contact'

export function EmergencyCallActions({ compact = false }: { compact?: boolean }) {
  const [contact, setContact] = useState<EmergencyContact | null>(null)

  useEffect(() => {
    let cancelled = false
    getStoredEmergencyContact().then((storedContact) => {
      if (!cancelled && hasEmergencyContact(storedContact)) setContact(storedContact)
    })

    return () => {
      cancelled = true
    }
  }, [])

  function confirmCall(label: string, phone: string) {
    Alert.alert(
      'Confirmer l’appel',
      `Ouvrir l’application Téléphone pour appeler ${label} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => void openPhone(phone) },
      ],
    )
  }

  async function openPhone(phone: string) {
    try {
      await Linking.openURL(`tel:${getDialablePhone(phone)}`)
    } catch {
      Alert.alert('Appel impossible', 'L’application Téléphone ne peut pas être ouverte sur cet appareil.')
    }
  }

  return (
    <View style={[styles.panel, compact && styles.compactPanel]}>
      {compact ? (
        <View style={styles.compactRow}>
          <View style={styles.compactLabel}>
            <Ionicons name="call-outline" size={20} color="#fbbf24" />
            <Text style={styles.compactTitle}>Urgence</Text>
          </View>
          {contact ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Appeler le contact d’urgence"
              style={styles.compactButton}
              onPress={() => confirmCall('mon contact d’urgence', contact.phone)}
            >
              <Text style={styles.compactButtonText}>Contact</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Appeler le 112"
            style={[styles.compactButton, styles.compactEmergencyButton]}
            onPress={() => confirmCall('le 112', '112')}
          >
            <Text style={styles.compactEmergencyText}>112</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!compact ? (
      <>
      <View style={styles.header}>
        <Ionicons name="call-outline" size={22} color="#fbbf24" />
        <View style={styles.copy}>
          <Text style={styles.title}>Besoin d’aide ?</Text>
          <Text style={styles.description}>Aucun appel ni partage de position automatique.</Text>
        </View>
      </View>
      {contact ? (
        <TouchableOpacity style={styles.contactButton} onPress={() => confirmCall('mon contact d’urgence', contact.phone)}>
          <Ionicons name="person-outline" size={20} color="#fef3c7" />
          <Text style={styles.contactButtonText}>APPELER MON CONTACT D’URGENCE</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.emergencyButton} onPress={() => confirmCall('le 112', '112')}>
        <Ionicons name="call" size={20} color="#ffffff" />
        <Text style={styles.emergencyButtonText}>APPELER LE 112</Text>
      </TouchableOpacity>
      </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  compactPanel: { backgroundColor: '#020617e8', borderColor: '#475569', marginBottom: 0, padding: 8 },
  compactRow: { alignItems: 'center', flexDirection: 'row', minHeight: 48 },
  compactLabel: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  compactTitle: { color: '#fef3c7', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  compactButton: {
    alignItems: 'center',
    backgroundColor: '#78350f',
    borderRadius: 10,
    justifyContent: 'center',
    marginLeft: 8,
    minHeight: 44,
    minWidth: 74,
    paddingHorizontal: 10,
  },
  compactButtonText: { color: '#fef3c7', fontSize: 12, fontWeight: '900' },
  compactEmergencyButton: { backgroundColor: '#991b1b' },
  compactEmergencyText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  header: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 14 },
  copy: { flex: 1, marginLeft: 10 },
  title: { color: '#f8fafc', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  description: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  contactButton: {
    alignItems: 'center',
    backgroundColor: '#78350f',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  contactButtonText: { color: '#fef3c7', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginLeft: 8 },
  emergencyButton: {
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  emergencyButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginLeft: 8 },
})
