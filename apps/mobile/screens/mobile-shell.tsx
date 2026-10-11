import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { MOBILE_DESTINATIONS, MOBILE_SHELL_SURFACE_STORAGE_KEY, MOBILE_WEB_BRIDGE_PATHS, type MobileDestinationId } from './mobile-shell-contract'
import { AccountScreen } from './account'
import { ActionJoinScreen } from './action-join'
import { ActionCreateScreen } from './action-create'
import { SignalementScreen } from './signalement'

type MobileShellProps = { onSignOut: () => void; onSessionExpired: () => void; onStartActivity: () => void | Promise<void> }
const webBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://cleanmymap.fr').replace(/\/$/, '')

async function openWebPath(path: string) {
  try { await Linking.openURL(`${webBaseUrl}${path}`) } catch { Alert.alert('Ouverture impossible', 'La surface web CleanMyMap ne peut pas être ouverte pour le moment.') }
}

export function MobileShell({ onSignOut, onSessionExpired, onStartActivity }: MobileShellProps) {
  const [surface, setSurface] = useState<MobileDestinationId>('act')
  useEffect(() => { void AsyncStorage.getItem(MOBILE_SHELL_SURFACE_STORAGE_KEY).then((stored) => { if (MOBILE_DESTINATIONS.some((item) => item.id === stored)) setSurface(stored as MobileDestinationId) }) }, [])
  function navigate(nextSurface: MobileDestinationId) { setSurface(nextSurface); void AsyncStorage.setItem(MOBILE_SHELL_SURFACE_STORAGE_KEY, nextSurface) }

  return <SafeAreaView style={styles.root}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {surface === 'act' ? <ActScreen onStart={onStartActivity} onSessionExpired={onSessionExpired} /> : null}
      {surface === 'map' ? <MapScreen /> : null}
      {surface === 'account' ? <AccountScreen onSignOut={onSignOut} onSessionExpired={onSessionExpired} onOpenWeb={(path) => void openWebPath(path)} /> : null}
    </ScrollView>
    <View style={styles.tabBar} accessibilityRole="tablist">{MOBILE_DESTINATIONS.map((item) => { const selected = surface === item.id; return <TouchableOpacity key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} style={styles.tab} onPress={() => navigate(item.id)}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={selected ? '#34d399' : '#64748b'} /><Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text></TouchableOpacity> })}</View>
  </SafeAreaView>
}

function ActScreen({ onStart, onSessionExpired }: { onStart: () => void; onSessionExpired: () => void }) {
  return <ScreenFrame eyebrow="AGIR" title="Agir sur le terrain."><Text style={styles.bodyText}>Démarrez un suivi GPS, rejoignez une action, organisez-la ou signalez une observation.</Text><PrimaryButton icon="navigate-outline" label="Démarrer une action" onPress={onStart} /><ActionJoinScreen onSessionExpired={onSessionExpired} /><View style={styles.surfaceDivider} /><ActionCreateScreen onSessionExpired={onSessionExpired} /><View style={styles.surfaceDivider} /><SignalementScreen onSessionExpired={onSessionExpired} /></ScreenFrame>
}

function MapScreen() { return <ScreenFrame eyebrow="CARTE" title="Carte live"><Text style={styles.bodyText}>Retrouvez la carte CleanMyMap et le suivi GPS de votre action en cours.</Text><WebButton path={MOBILE_WEB_BRIDGE_PATHS.map} icon="open-outline" label="Ouvrir la carte CleanMyMap" /><InfoCard icon="map-outline" title="Suivi GPS conservé" description="Le suivi, la reprise hors ligne, la finalisation serveur et le contact d'urgence restent disponibles." /></ScreenFrame> }
function ScreenFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><View style={styles.separator} />{children}</View> }
function PrimaryButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <TouchableOpacity style={styles.primaryButton} onPress={onPress} accessibilityRole="button"><Ionicons name={icon} size={20} color="#022c22" /><Text style={styles.primaryButtonLabel}>{label}</Text></TouchableOpacity> }
function WebButton({ path, icon, label }: { path: string; icon: keyof typeof Ionicons.glyphMap; label: string }) { return <TouchableOpacity style={styles.secondaryButton} onPress={() => void openWebPath(path)} accessibilityRole="button"><Ionicons name={icon} size={20} color="#a7f3d0" /><Text style={styles.secondaryButtonLabel}>{label}</Text></TouchableOpacity> }
function InfoCard({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }) { return <View style={styles.infoCard}><Ionicons name={icon} size={24} color="#34d399" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDescription}>{description}</Text></View></View> }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' }, content: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 32 },
  eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 16 }, separator: { height: 1, backgroundColor: '#1e293b', marginBottom: 24 }, bodyText: { color: '#cbd5e1', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#34d399', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, marginBottom: 20 }, primaryButtonLabel: { color: '#022c22', fontSize: 14, fontWeight: '900' }, secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderColor: '#334155', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12 }, secondaryButtonLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800' },
  surfaceDivider: { backgroundColor: '#1e293b', height: 1, marginVertical: 28 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 20 }, infoCopy: { flex: 1, marginLeft: 12 }, infoTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 5 }, infoDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18 }, signOutButton: { alignItems: 'center', paddingVertical: 18, marginTop: 12 }, signOutLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopColor: '#1e293b', borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 }, tab: { alignItems: 'center', flex: 1, gap: 4 }, tabLabel: { color: '#64748b', fontSize: 10, fontWeight: '700' }, tabLabelSelected: { color: '#34d399' },
})
