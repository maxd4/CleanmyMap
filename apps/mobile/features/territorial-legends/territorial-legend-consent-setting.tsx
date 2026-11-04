import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { TerritorialLegendsController } from './use-territorial-legends-controller'

export function TerritorialLegendConsentSetting({ controller }: { controller: TerritorialLegendsController }) {
  const { consent, consentLoading, savingConsent, error, setTerritorialLegendConsent } = controller
  const enabled = consent?.enabled === true
  return <View style={styles.panel} testID="mobile-territorial-consent-setting">
    <Text style={styles.title}>Consentement territorial</Text>
    <Text style={styles.description}>Autorisez votre participation aux classements territoriaux publics. Votre progression privée reste consultable sans ce consentement. Vous pouvez le révoquer à tout moment ; la révocation ne supprime pas votre historique privé auditable.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.row}><Text style={styles.status}>{consentLoading ? 'Chargement…' : enabled ? 'Activé' : 'Désactivé'}</Text><TouchableOpacity disabled={consentLoading || savingConsent || !consent} onPress={() => void setTerritorialLegendConsent(!enabled)} accessibilityRole="switch" accessibilityState={{ checked: enabled, disabled: consentLoading || savingConsent || !consent }} style={[styles.switch, enabled && styles.switchOn]}><Text style={styles.switchText}>{savingConsent ? '…' : enabled ? 'Oui' : 'Non'}</Text></TouchableOpacity></View>
    {consent?.revokedAt ? <Text style={styles.meta}>Révoqué le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(consent.revokedAt))}.</Text> : null}
    {consentLoading ? <ActivityIndicator color="#34d399" style={styles.loader} /> : null}
  </View>
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 14 }, title: { color: '#e2e8f0', fontSize: 15, fontWeight: '900', marginBottom: 8 }, description: { color: '#94a3b8', fontSize: 12, lineHeight: 18 }, row: { alignItems: 'center', borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12 }, status: { color: '#d1fae5', fontSize: 13, fontWeight: '900' }, switch: { alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, minHeight: 44, minWidth: 58, paddingHorizontal: 10, paddingVertical: 8 }, switchOn: { backgroundColor: '#064e3b', borderColor: '#34d399' }, switchText: { color: '#d1fae5', fontSize: 13, fontWeight: '900' }, meta: { color: '#64748b', fontSize: 11, marginTop: 8 }, error: { backgroundColor: '#451a1a', borderRadius: 10, color: '#fecaca', fontSize: 12, lineHeight: 18, marginTop: 10, padding: 10 }, loader: { marginTop: 10 },
})
