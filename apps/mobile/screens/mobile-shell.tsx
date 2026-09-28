import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import {
  MOBILE_DESTINATIONS,
  MOBILE_WEB_BRIDGE_PATHS,
  type MobileDestinationId,
} from './mobile-shell-contract'

type MobileSurface = MobileDestinationId

type MobileShellProps = {
  onSignOut: () => void
  onStartActivity: () => void | Promise<void>
}

const webBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://cleanmymap.fr').replace(/\/$/, '')

async function openWebPath(path: string) {
  try {
    await Linking.openURL(`${webBaseUrl}${path}`)
  } catch {
    Alert.alert('Ouverture impossible', 'La surface web CleanMyMap ne peut pas être ouverte pour le moment.')
  }
}

export function MobileShell({ onSignOut, onStartActivity }: MobileShellProps) {
  const [surface, setSurface] = useState<MobileSurface>('home')
  const destination = surface

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        {surface === 'home' ? <HomeScreen onStart={onStartActivity} onMap={() => setSurface('map')} /> : null}
        {surface === 'map' ? <MapScreen /> : null}
        {surface === 'act' ? <ActScreen onStart={onStartActivity} /> : null}
        {surface === 'messages' ? <MessagesScreen /> : null}
        {surface === 'profile' ? <ProfileScreen onSignOut={onSignOut} /> : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {MOBILE_DESTINATIONS.map((item) => {
          const selected = destination === item.id
          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.tab}
              onPress={() => setSurface(item.id)}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={selected ? '#34d399' : '#64748b'}
              />
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function HomeScreen({ onStart, onMap }: { onStart: () => void; onMap: () => void }) {
  return (
    <ScreenFrame eyebrow="BÉNÉVOLE TERRAIN" title="Agir simplement sur le terrain.">
      <Text style={styles.bodyText}>
        Une base mobile légère pour retrouver les actions utiles sans reproduire tout le site CleanMyMap.
      </Text>
      <PrimaryButton icon="navigate-outline" label="Démarrer une action" onPress={onStart} />
      <SecondaryButton icon="map-outline" label="Consulter la carte" onPress={onMap} />
      <InfoCard
        icon="leaf-outline"
        title="Même backend, mêmes contrats"
        description="Les données et effets métier restent partagés avec le web."
      />
    </ScreenFrame>
  )
}

function MapScreen() {
  return (
    <ScreenFrame eyebrow="CONSULTATION TERRAIN" title="Carte">
      <Text style={styles.bodyText}>
        La consultation mobile reste volontairement minimale. Les couches avancées et la supervision restent sur le web.
      </Text>
      <WebButton path={MOBILE_WEB_BRIDGE_PATHS.map} icon="open-outline" label="Ouvrir la carte CleanMyMap" />
      <InfoCard
        icon="map-outline"
        title="Future évolution"
        description="Le mode activité GPS live avec carte et tracé temps réel fera l'objet d'un lot dédié."
      />
    </ScreenFrame>
  )
}

function ActScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScreenFrame eyebrow="ACTIONS TERRAIN" title="Agir">
      <Text style={styles.bodyText}>Choisissez une action. Les parcours complexes restent portés par le web.</Text>
      <ActionChoice
        icon="navigate-outline"
        title="Démarrer une action"
        description="Futur mode activité GPS"
        onPress={onStart}
      />
      <ActionChoice
        icon="people-outline"
        title="Rejoindre une action"
        description="Retrouver les actions proposées"
        onPress={() => void openWebPath(MOBILE_WEB_BRIDGE_PATHS.joinAction)}
      />
      <ActionChoice
        icon="add-circle-outline"
        title="Organiser une action"
        description="Créer une action depuis le web"
        onPress={() => void openWebPath(MOBILE_WEB_BRIDGE_PATHS.organizeAction)}
      />
      <ActionChoice
        icon="trash-outline"
        title="Signaler un déchet"
        description="Utiliser le signalement CleanMyMap"
        onPress={() => void openWebPath(MOBILE_WEB_BRIDGE_PATHS.reportWaste)}
      />
    </ScreenFrame>
  )
}

function MessagesScreen() {
  return (
    <ScreenFrame eyebrow="COMMUNAUTÉ" title="Messages">
      <Text style={styles.bodyText}>
        La messagerie reste celle de CleanMyMap. L'application mobile n'introduit pas de second système de messages.
      </Text>
      <WebButton path={MOBILE_WEB_BRIDGE_PATHS.messages} icon="chatbubble-ellipses-outline" label="Ouvrir la messagerie" />
    </ScreenFrame>
  )
}

function ProfileScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <ScreenFrame eyebrow="COMPTE" title="Profil">
      <Text style={styles.bodyText}>Les réglages essentiels restent accessibles avec votre compte Clerk.</Text>
      <WebButton path={MOBILE_WEB_BRIDGE_PATHS.profile} icon="person-outline" label="Ouvrir mon profil web" />
      <WebButton path={MOBILE_WEB_BRIDGE_PATHS.settings} icon="settings-outline" label="Ouvrir mes réglages" />
      <InfoCard
        icon="shield-checkmark-outline"
        title="Contact d'urgence"
        description="Emplacement réservé pour un futur lot ; aucun contrat métier n'est encore implémenté."
      />
      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutLabel}>SE DÉCONNECTER</Text>
      </TouchableOpacity>
    </ScreenFrame>
  )
}

function ScreenFrame({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.separator} />
      {children}
    </View>
  )
}

function PrimaryButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.primaryButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#022c22" />
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function SecondaryButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#a7f3d0" />
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function WebButton({ path, icon, label }: { path: string; icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return <SecondaryButton icon={icon} label={label} onPress={() => void openWebPath(path)} />
}

function ActionChoice({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionChoice} onPress={onPress}>
      <View style={styles.actionChoiceIcon}>
        <Ionicons name={icon} size={24} color="#34d399" />
      </View>
      <View style={styles.actionChoiceCopy}>
        <Text style={styles.actionChoiceTitle}>{title}</Text>
        <Text style={styles.actionChoiceDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
  )
}

function InfoCard({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={24} color="#34d399" />
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 32 },
  eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#f8fafc', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 16 },
  separator: { height: 1, backgroundColor: '#1e293b', marginBottom: 24 },
  bodyText: { color: '#cbd5e1', fontSize: 16, lineHeight: 24, marginBottom: 24 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#34d399', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, marginBottom: 12,
  },
  primaryButtonLabel: { color: '#022c22', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderColor: '#334155', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12,
  },
  secondaryButtonLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '800' },
  actionChoice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderColor: '#1e293b',
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  actionChoiceIcon: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#064e3b', borderRadius: 12,
    height: 48, width: 48, marginRight: 14,
  },
  actionChoiceCopy: { flex: 1 },
  actionChoiceTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  actionChoiceDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0f172a', borderColor: '#1e293b',
    borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 20,
  },
  infoCopy: { flex: 1, marginLeft: 12 },
  infoTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  infoDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  signOutButton: { alignItems: 'center', paddingVertical: 18, marginTop: 12 },
  signOutLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#0f172a', borderTopColor: '#1e293b', borderTopWidth: 1,
    paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12,
  },
  tab: { alignItems: 'center', flex: 1, gap: 4 },
  tabLabel: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  tabLabelSelected: { color: '#34d399' },
})
