import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import {
  startTracking,
  stopTracking,
  restoreActiveTracking,
  getMission,
} from './lib/tracking-service';
import type { Mission, MissionLocation, TrackingPhase } from './types/mission';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function formatCoords(loc: MissionLocation): string {
  return `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [phase, setPhase] = useState<TrackingPhase>('idle');
  const [mission, setMission] = useState<Mission | null>(null);
  const [lastLocation, setLastLocation] = useState<MissionLocation | null>(null);
  const [missionIdInput, setMissionIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initialisation ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));

    // Restaurer une mission active si l'app a été redémarrée
    restoreActiveTracking().then(async (id) => {
      if (!id) return;
      const result = await getMission(id);
      if (result.ok && result.data.status === 'tracking') {
        setMission(result.data);
        setPhase('tracking');
        startDurationTimer(result.data.started_at ?? new Date().toISOString());
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      stopDurationTimer();
    };
  }, []);

  // ── Timer durée ─────────────────────────────────────────────────────────────
  function startDurationTimer(startedAt: string) {
    setDuration(formatDuration(startedAt));
    timerRef.current = setInterval(() => setDuration(formatDuration(startedAt)), 10_000);
  }
  function stopDurationTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // ── Auth anonyme (dev uniquement) ───────────────────────────────────────────
  async function handleAnonymousLogin() {
    setPhase('requesting');
    const { error } = await supabase.auth.signInAnonymously();
    if (error) setErrorMsg(error.message);
    setPhase('idle');
  }

  // ── Démarrer le trajet ──────────────────────────────────────────────────────
  async function handleStart() {
    setErrorMsg(null);
    const id = missionIdInput.trim();
    if (!id) {
      setErrorMsg('Entrez un identifiant de mission.');
      return;
    }
    if (!session) {
      setErrorMsg('Vous devez être connecté.');
      return;
    }

    setPhase('requesting');

    // TODO : ici, en production, l'ID viendra d'un deep link ou d'un QR scan
    // (voir architecture_gps_companion.md § 8 — Deep Link / QR Code)
    const result = await startTracking(id);

    if (!result.ok) {
      setErrorMsg(result.error);
      setPhase('error');
      return;
    }

    setMission(result.data);
    setPhase('tracking');
    startDurationTimer(result.data.started_at ?? new Date().toISOString());
  }

  // ── Terminer le trajet ──────────────────────────────────────────────────────
  async function handleStop() {
    if (!mission) return;
    setErrorMsg(null);
    setPhase('stopping');
    stopDurationTimer();

    const result = await stopTracking(mission.id);

    if (!result.ok) {
      setErrorMsg(result.error);
      setPhase('error');
      return;
    }

    Alert.alert(
      'Mission terminée 🎉',
      'Bravo ! Vos statistiques seront calculées et visibles sur le site.',
    );
    setMission(null);
    setLastLocation(null);
    setMissionIdInput('');
    setPhase('idle');
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  // Loading / transition
  if (phase === 'requesting' || phase === 'stopping') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>
          {phase === 'stopping' ? 'Finalisation…' : 'Démarrage…'}
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  // Écran de connexion
  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.appTitle}>CleanMyMap GPS</Text>
        <Text style={styles.subtitle}>Connectez-vous pour commencer une mission.</Text>
        {/* TODO : remplacer par Supabase Magic Link ou OAuth en production */}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAnonymousLogin}>
          <Text style={styles.btnText}>Connexion anonyme (test)</Text>
        </TouchableOpacity>
        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
        <StatusBar style="dark" />
      </View>
    );
  }

  // Écran de tracking actif
  if (phase === 'tracking' && mission) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style="dark" />

        {/* Statut */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Enregistrement actif</Text>
        </View>

        {/* Infos mission */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Mission</Text>
          <Text style={styles.cardValue} numberOfLines={2}>{mission.label}</Text>
          <Text style={styles.cardMeta}>ID : {mission.id}</Text>
        </View>

        {/* Durée */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Durée</Text>
          <Text style={styles.durationText}>{duration || '…'}</Text>
        </View>

        {/* Dernier point GPS */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Dernier point GPS</Text>
          {lastLocation ? (
            <>
              <Text style={styles.cardValue}>{formatCoords(lastLocation)}</Text>
              {lastLocation.accuracy_m != null && (
                <Text style={styles.cardMeta}>
                  Précision : ±{Math.round(lastLocation.accuracy_m)} m
                </Text>
              )}
              <Text style={styles.cardMeta}>
                {new Date(lastLocation.recorded_at).toLocaleTimeString('fr-FR')}
              </Text>
            </>
          ) : (
            <Text style={styles.cardMeta}>En attente du premier fix GPS…</Text>
          )}
        </View>

        <Text style={styles.hint}>
          Vous pouvez éteindre l'écran. Le suivi continue en arrière-plan.
        </Text>

        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        <TouchableOpacity style={styles.btnDanger} onPress={handleStop}>
          <Text style={styles.btnText}>Terminer le trajet</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Écran d'accueil / saisie de mission
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.appTitle}>CleanMyMap GPS</Text>
      <Text style={styles.subtitle}>
        Entrez l'identifiant de votre mission ou scannez le QR code.
      </Text>

      {/* Champ mission_id */}
      {/* TODO : ajouter un bouton "Scanner QR" via expo-barcode-scanner */}
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Identifiant de mission</Text>
        <TextInput
          style={styles.input}
          value={missionIdInput}
          onChangeText={setMissionIdInput}
          placeholder="ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{errorMsg}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btnPrimary} onPress={handleStart}>
        <Text style={styles.btnText}>▶ Démarrer le trajet</Text>
      </TouchableOpacity>

      <Text style={styles.userInfo}>
        Connecté en tant que : {session.user?.email ?? session.user?.id?.slice(0, 8) + '…'}
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#10b981',   // emerald-500
  danger: '#ef4444',    // red-500
  bg: '#f8fafc',        // slate-50
  card: '#ffffff',
  text: '#0f172a',      // slate-900
  muted: '#64748b',     // slate-500
  subtle: '#94a3b8',    // slate-400
  border: '#e2e8f0',    // slate-200
  error: '#ef4444',
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
    gap: 16,
    paddingTop: 72,
    paddingBottom: 48,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 12,
  },
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5', // emerald-100
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46', // emerald-900
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  durationText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  hint: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  // Input
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  // Buttons
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.danger,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Errors
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  userInfo: {
    fontSize: 12,
    color: COLORS.subtle,
    textAlign: 'center',
    marginTop: 8,
  },
});
