import React, { useEffect, useState } from 'react'
import { Alert, BackHandler, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CircleUserRound, ExternalLink, HandHelping, House, Map, UsersRound, GraduationCap, ArrowLeft, type LucideIcon } from 'lucide-react-native'
import { MOBILE_DESTINATIONS, MOBILE_SHELL_SURFACE_STORAGE_KEY, MOBILE_WEB_BRIDGE_PATHS, type MobileDestinationId } from './mobile-shell-contract'
import { AccountScreen } from './account'
import { ActionJoinScreen } from './action-join'
import { ActionCreateScreen } from './action-create'
import { SignalementScreen } from './signalement'

type MobileShellProps = { onSignOut: () => void; onSessionExpired: () => void; onStartActivity: () => void | Promise<void> }
type ActSubview = 'home' | 'join' | 'create' | 'report'
const webBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://cleanmymap.fr').replace(/\/$/, '')

const NAV_ICONS: Record<string, LucideIcon> = {
  'hand-helping': HandHelping,
  map: Map,
  'circle-user-round': CircleUserRound,
  house: House,
  'users-round': UsersRound,
  'graduation-cap': GraduationCap,
}

async function openWebPath(path: string) {
  try { await Linking.openURL(`${webBaseUrl}${path}`) } catch { Alert.alert('Ouverture impossible', 'La surface web CleanMyMap ne peut pas être ouverte pour le moment.') }
}

export function MobileShell({ onSignOut, onSessionExpired, onStartActivity }: MobileShellProps) {
  const [surface, setSurface] = useState<MobileDestinationId>('act')
  const [actSubview, setActSubview] = useState<ActSubview>('home')
  useEffect(() => { void AsyncStorage.getItem(MOBILE_SHELL_SURFACE_STORAGE_KEY).then((stored) => { if (MOBILE_DESTINATIONS.some((item) => item.id === stored)) setSurface(stored as MobileDestinationId) }) }, [])
  function navigate(nextSurface: MobileDestinationId) { setSurface(nextSurface); void AsyncStorage.setItem(MOBILE_SHELL_SURFACE_STORAGE_KEY, nextSurface) }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (surface === 'act' && actSubview !== 'home') {
        setActSubview('home')
        return true
      }
      if (surface !== 'act') {
        navigate('act')
        return true
      }
      return false
    })
    return () => subscription.remove()
  }, [actSubview, surface])

  return <SafeAreaView style={styles.root}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={surface === 'act' ? styles.visibleSurface : styles.hiddenSubview} pointerEvents={surface === 'act' ? 'auto' : 'none'}><ActScreen actSubview={actSubview} onActSubview={setActSubview} onStart={onStartActivity} onSessionExpired={onSessionExpired} /></View>
      <View style={surface === 'map' ? styles.visibleSurface : styles.hiddenSubview} pointerEvents={surface === 'map' ? 'auto' : 'none'}><MapScreen /></View>
      <View style={surface === 'account' ? styles.visibleSurface : styles.hiddenSubview} pointerEvents={surface === 'account' ? 'auto' : 'none'}><AccountScreen onSignOut={onSignOut} onSessionExpired={onSessionExpired} onOpenWeb={(path) => void openWebPath(path)} /></View>
    </ScrollView>
    <View style={styles.tabBar} accessibilityRole="tablist">{MOBILE_DESTINATIONS.map((item) => { const selected = surface === item.id; const Icon = NAV_ICONS[item.icon]; return <TouchableOpacity key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} style={[styles.tab, selected && styles.tabSelected]} onPress={() => navigate(item.id)}><Icon size={22} color={selected ? '#34d399' : '#64748b'} strokeWidth={selected ? 2.5 : 2} /><Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text></TouchableOpacity> })}</View>
  </SafeAreaView>
}

function ActScreen({ actSubview, onActSubview, onStart, onSessionExpired }: { actSubview: ActSubview; onActSubview: (next: ActSubview) => void; onStart: () => void; onSessionExpired: () => void }) {
  return <>
    <View style={actSubview === 'home' ? styles.visibleSubview : styles.hiddenSubview} pointerEvents={actSubview === 'home' ? 'auto' : 'none'}>
      <ScreenFrame eyebrow="AGIR" title="Agir sur le terrain."><Text style={styles.bodyText}>Une seule entrée à la fois : démarrez une mission GPS, rejoignez une action, organisez-la ou signalez une observation.</Text><PrimaryButton label="Démarrer une action" onPress={onStart} /><SubviewButton label="Rejoindre une action" description="Trouver, suivre ou annuler une inscription" onPress={() => onActSubview('join')} /><SubviewButton label="Créer une action" description="Préparer, vérifier et publier" onPress={() => onActSubview('create')} /><SubviewButton label="Signaler un déchet" description="Transmettre une observation et ses preuves" onPress={() => onActSubview('report')} /></ScreenFrame>
    </View>
    <FlowSubview visible={actSubview === 'join'} title="Rejoindre une action" onBack={() => onActSubview('home')}><ActionJoinScreen onSessionExpired={onSessionExpired} /></FlowSubview>
    <FlowSubview visible={actSubview === 'create'} title="Créer une action" onBack={() => onActSubview('home')}><ActionCreateScreen onSessionExpired={onSessionExpired} /></FlowSubview>
    <FlowSubview visible={actSubview === 'report'} title="Signaler un déchet" onBack={() => onActSubview('home')}><SignalementScreen onSessionExpired={onSessionExpired} /></FlowSubview>
  </>
}

function FlowSubview({ visible, title, onBack, children }: { visible: boolean; title: string; onBack: () => void; children: React.ReactNode }) { return <View style={visible ? styles.visibleSubview : styles.hiddenSubview} pointerEvents={visible ? 'auto' : 'none'}><TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel={`Retour à Agir depuis ${title}`}><ArrowLeft size={18} color="#a7f3d0" /><Text style={styles.backLabel}>Retour à Agir</Text></TouchableOpacity>{children}</View> }
function MapScreen() { return <ScreenFrame eyebrow="CARTE" title="Carte live"><Text style={styles.bodyText}>Retrouvez la carte CleanMyMap et le suivi GPS de votre action en cours.</Text><WebButton path={MOBILE_WEB_BRIDGE_PATHS.map} label="Ouvrir la carte CleanMyMap" /><InfoCard title="Suivi GPS conservé" description="Le suivi, la reprise hors ligne, la finalisation serveur et le contact d'urgence restent disponibles." /></ScreenFrame> }
function ScreenFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><View style={styles.separator} />{children}</View> }
function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity style={styles.primaryButton} onPress={onPress} accessibilityRole="button"><HandHelping size={20} color="#022c22" /><Text style={styles.primaryButtonLabel}>{label}</Text></TouchableOpacity> }
function SubviewButton({ label, description, onPress }: { label: string; description: string; onPress: () => void }) { return <TouchableOpacity style={styles.subviewButton} onPress={onPress} accessibilityRole="button"><View style={styles.subviewCopy}><Text style={styles.subviewLabel}>{label}</Text><Text style={styles.subviewDescription}>{description}</Text></View><Text style={styles.subviewChevron}>›</Text></TouchableOpacity> }
function WebButton({ path, label }: { path: string; label: string }) { return <TouchableOpacity style={styles.secondaryButton} onPress={() => void openWebPath(path)} accessibilityRole="button"><ExternalLink size={20} color="#a7f3d0" /><Text style={styles.secondaryButtonLabel}>{label}</Text></TouchableOpacity> }
function InfoCard({ title, description }: { title: string; description: string }) { return <View style={styles.infoCard}><Map size={24} color="#34d399" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDescription}>{description}</Text></View></View> }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' }, content: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 32 }, visibleSurface: { flex: 1 }, visibleSubview: { flex: 1 }, hiddenSubview: { display: 'none' },
  eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 16 }, separator: { height: 1, backgroundColor: '#1e293b', marginBottom: 24 }, bodyText: { color: '#cbd5e1', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#34d399', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, marginBottom: 12 }, primaryButtonLabel: { color: '#022c22', fontSize: 14, fontWeight: '900' }, subviewButton: { flexDirection: 'row', alignItems: 'center', borderColor: '#334155', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12 }, subviewCopy: { flex: 1 }, subviewLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '900' }, subviewDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 4 }, subviewChevron: { color: '#34d399', fontSize: 26, fontWeight: '300', marginLeft: 12 }, backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginBottom: 16 }, backLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800' }, secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderColor: '#334155', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12 }, secondaryButtonLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800' },
  surfaceDivider: { backgroundColor: '#1e293b', height: 1, marginVertical: 28 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 20 }, infoCopy: { flex: 1, marginLeft: 12 }, infoTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 5 }, infoDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18 }, signOutButton: { alignItems: 'center', paddingVertical: 18, marginTop: 12 }, signOutLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopColor: '#1e293b', borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 }, tab: { alignItems: 'center', flex: 1, gap: 4, paddingVertical: 4 }, tabSelected: { backgroundColor: '#172033', borderRadius: 12 }, tabLabel: { color: '#64748b', fontSize: 10, fontWeight: '700' }, tabLabelSelected: { color: '#34d399' },
})
