import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, Alert } from 'react-native';
import { supabase } from './lib/supabase';
import { startTrackingTask, stopTrackingTask } from './tasks/gps-task';
import { getStoredMissionId, setStoredMissionId, clearStoredMissionId } from './lib/storage';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    checkExistingMission();
  }, []);

  async function checkExistingMission() {
    const id = await getStoredMissionId();
    if (id) {
      setMissionId(id);
      setTracking(true); // Supposons qu'elle est en cours si en storage
    }
    setLoading(false);
  }

  // Fonction simplifiée (en prod, l'ID viendrait d'un Deep Link ou d'un Scan QR)
  async function startMission() {
    if (!session) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    try {
      setLoading(true);
      // Création d'une mission de test ou fetch depuis param
      const { data, error } = await supabase
        .from('missions')
        .insert({ 
          volunteer_id: session.user.id,
          label: 'Mission CleanMyMap',
          status: 'tracking',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await setStoredMissionId(data.id);
      setMissionId(data.id);
      
      // Démarrer l'enregistrement GPS
      await startTrackingTask();
      setTracking(true);
      Alert.alert('Succès', 'La mission a démarré, bon nettoyage !');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function endMission() {
    try {
      setLoading(true);
      if (missionId) {
        await supabase
          .from('missions')
          .update({ 
            status: 'completed', 
            ended_at: new Date().toISOString() 
          })
          .eq('id', missionId);
        
        // Optionnel : déclencher compute_mission_distance via supabase.rpc('compute_mission_distance', { p_mission_id: missionId })
      }
      
      await stopTrackingTask();
      await clearStoredMissionId();
      
      setMissionId(null);
      setTracking(false);
      Alert.alert('Bravo !', 'La mission est terminée. Vos statistiques seront calculées.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- UI ---
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>CleanMyMap GPS</Text>
        <Text style={styles.subtitle}>Vous devez vous connecter à l'app principale.</Text>
        <Button title="Connexion Anonyme (Test)" onPress={async () => {
          setLoading(true);
          await supabase.auth.signInAnonymously();
          setLoading(false);
        }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Companion GPS</Text>
      
      {!tracking ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Prêt à commencer le nettoyage ?</Text>
          <Button title="Démarrer la Mission" color="#10b981" onPress={startMission} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.trackingText}>🔴 Enregistrement en cours...</Text>
          <Text style={styles.subtitle}>Vous pouvez verrouiller votre téléphone.</Text>
          <View style={{ marginTop: 20 }}>
            <Button title="Terminer la Mission" color="#ef4444" onPress={endMission} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  trackingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  }
});
