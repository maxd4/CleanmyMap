import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { createMobileSignalement, loadMyMobileSignalements } from '../lib/mobile-actions-service'
import { loadSignalementMedia, pickSignalementPhotos, uploadSignalementPhotos, type MobileMediaItem, type MobilePickedPhoto } from '../lib/signalement-media-service'

type SignalementProps = { onSessionExpired: () => void }
type ReportType = 'spot' | 'clean_place'
const CATEGORY_OPTIONS = [
  ['plastic', 'Plastique'], ['glass', 'Verre'], ['cigarette_butt', 'Mégots'], ['metal', 'Métal'], ['mixed_residual', 'Résiduel'],
] as const

export function SignalementScreen({ onSessionExpired }: SignalementProps) {
  const [type, setType] = useState<ReportType>('spot')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadMyMobileSignalements>>['items']>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [photos, setPhotos] = useState<MobilePickedPhoto[]>([])
  const [evidence, setEvidence] = useState<Record<string, MobileMediaItem[]>>({})

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems((await loadMyMobileSignalements()).items) }
    catch (value) { if ((value as { status?: number }).status === 401) onSessionExpired(); else setError(value instanceof Error ? value.message : 'Mes observations sont indisponibles.') }
    finally { setLoading(false) }
  }, [onSessionExpired])
  useEffect(() => { void refresh() }, [refresh])

  async function getCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') { setError('La permission de localisation est nécessaire pour ce signalement.'); return }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setLatitude(position.coords.latitude.toFixed(6)); setLongitude(position.coords.longitude.toFixed(6)); setMessage('Position actuelle ajoutée.')
  }

  async function submit() {
    setBusy(true); setError(null); setMessage(null)
    const parsedLatitude = Number(latitude); const parsedLongitude = Number(longitude)
    if (!label.trim() || !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) { setError('Indiquez un lieu et une position valide, ou utilisez la position actuelle.'); setBusy(false); return }
    try {
      const result = await createMobileSignalement({ type, label, latitude: parsedLatitude, longitude: parsedLongitude, notes: notes || undefined, wasteCategories: type === 'spot' ? categories : undefined })
      let confirmation = result.status === 'created' ? 'Signalement transmis et confirmé par le serveur.' : 'Signalement transmis.'
      if (photos.length > 0) {
        const upload = await uploadSignalementPhotos(result.item.id, photos)
        confirmation += upload.failed.length > 0
          ? ` ${upload.uploadedCount} photo(s) transmise(s), ${upload.failed.length} à reprendre.`
          : ` ${upload.uploadedCount} preuve(s) photo confirmée(s).`
      }
      setMessage(confirmation)
      setLabel(''); setNotes(''); setCategories([]); setPhotos([]); await refresh()
    } catch (value) { if ((value as { status?: number }).status === 401) onSessionExpired(); else setError(value instanceof Error ? value.message : 'Le signalement n’a pas abouti.') }
    finally { setBusy(false) }
  }

  function toggleCategory(value: string) { setCategories((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) }

  async function choosePhotos() {
    try { setPhotos(await pickSignalementPhotos()); setError(null) }
    catch (value) { setError(value instanceof Error ? value.message : 'Les photos ne peuvent pas être sélectionnées.') }
  }

  async function showEvidence(signalementId: string) {
    try { const media = await loadSignalementMedia(signalementId); setEvidence((current) => ({ ...current, [signalementId]: media })) }
    catch (value) { if ((value as { status?: number }).status === 401) onSessionExpired(); else setError(value instanceof Error ? value.message : 'Les preuves photo sont indisponibles.') }
  }

  return <View style={styles.root}>
    <Text style={styles.eyebrow}>TERRAIN</Text><Text style={styles.title}>Signaler un déchet</Text>
    <Text style={styles.body}>Les observations sont écrites dans la source canonique trash_spotter_spots. Le statut et la modération restent serveur.</Text>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}{message ? <Text style={styles.success}>{message}</Text> : null}
    <View style={styles.card}><Text style={styles.cardTitle}>Nouvelle observation</Text><View style={styles.segment}><TouchableOpacity onPress={() => setType('spot')} accessibilityRole="radio" accessibilityState={{ checked: type === 'spot' }} style={[styles.segmentButton, type === 'spot' && styles.segmentSelected]}><Text style={styles.segmentLabel}>Déchet à traiter</Text></TouchableOpacity><TouchableOpacity onPress={() => setType('clean_place')} accessibilityRole="radio" accessibilityState={{ checked: type === 'clean_place' }} style={[styles.segmentButton, type === 'clean_place' && styles.segmentSelected]}><Text style={styles.segmentLabel}>Lieu propre</Text></TouchableOpacity></View><Field label="Lieu ou repère" value={label} onChangeText={setLabel} placeholder="Rue, parc, repère" /><View style={styles.row}><Field label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" placeholder="48.8566" /><Field label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" placeholder="2.3522" /></View><TouchableOpacity style={styles.outlineButton} onPress={() => void getCurrentPosition()} accessibilityRole="button"><Ionicons name="locate-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>Utiliser ma position actuelle</Text></TouchableOpacity>{type === 'spot' ? <><Text style={styles.label}>Catégories observées</Text><View style={styles.chips}>{CATEGORY_OPTIONS.map(([value, display]) => <TouchableOpacity key={value} onPress={() => toggleCategory(value)} accessibilityRole="checkbox" accessibilityState={{ checked: categories.includes(value) }} style={[styles.chip, categories.includes(value) && styles.chipSelected]}><Text style={styles.chipLabel}>{display}</Text></TouchableOpacity>)}</View></> : null}<Field label="Observations" value={notes} onChangeText={setNotes} placeholder="Précisions utiles, sans donnée personnelle" multiline /><TouchableOpacity style={styles.outlineButton} onPress={() => void choosePhotos()} accessibilityRole="button"><Ionicons name="camera-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>{photos.length > 0 ? `${photos.length} photo(s) sélectionnée(s)` : 'Ajouter des preuves photo (facultatif)'}</Text></TouchableOpacity><Text style={styles.helper}>Les photos sont compressées et transmises séparément. En cas de succès partiel, vous pouvez reprendre sans recréer le signalement.</Text><TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={() => void submit()} accessibilityRole="button"><Text style={styles.primaryLabel}>{busy ? 'Transmission...' : 'Transmettre le signalement'}</Text></TouchableOpacity></View>
    <View style={styles.card}><View style={styles.listHeader}><Text style={styles.cardTitle}>Mes observations</Text><TouchableOpacity onPress={() => void refresh()} accessibilityRole="button" accessibilityLabel="Actualiser mes observations"><Ionicons name="refresh-outline" size={20} color="#a7f3d0" /></TouchableOpacity></View>{loading ? <ActivityIndicator color="#34d399" /> : items.length === 0 ? <Text style={styles.helper}>Aucune observation transmise depuis ce compte.</Text> : items.map((item) => <View key={item.id} style={styles.item}><View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.label}</Text><Text style={styles.itemMeta}>{item.type === 'spot' ? 'Déchet' : 'Lieu propre'} · {new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>{evidence[item.id] !== undefined ? <>{evidence[item.id].length === 0 ? <Text style={styles.itemMeta}>Aucune preuve photo accessible.</Text> : <View style={styles.evidenceGrid}>{evidence[item.id].map((media) => <Image key={media.id} source={{ uri: media.signedUrl }} style={styles.evidenceImage} accessibilityLabel={`Preuve photo ${media.originalName}`} />)}</View>}</> : null}<TouchableOpacity onPress={() => void showEvidence(item.id)} accessibilityRole="button"><Text style={styles.evidenceLink}>Voir les preuves photo</Text></TouchableOpacity></View><Text style={styles.status}>{item.status}</Text></View>)}</View>
  </View>
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric'; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748b" keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.multiline]} /></View> }

const styles = StyleSheet.create({ root: { paddingBottom: 16 }, eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', marginBottom: 12 }, body: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 16 }, card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 }, cardTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: '900', marginBottom: 14 }, segment: { flexDirection: 'row', gap: 6, marginBottom: 14 }, segmentButton: { flex: 1, alignItems: 'center', borderColor: '#334155', borderRadius: 10, borderWidth: 1, padding: 11 }, segmentSelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, segmentLabel: { color: '#d1fae5', fontSize: 11, fontWeight: '800', textAlign: 'center' }, field: { flex: 1, marginBottom: 12 }, label: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', marginBottom: 6 }, input: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 10, borderWidth: 1, color: '#f8fafc', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, multiline: { minHeight: 76, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 10 }, outlineButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12, padding: 12 }, secondaryLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }, chip: { borderColor: '#475569', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 }, chipSelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, chipLabel: { color: '#d1fae5', fontSize: 11, fontWeight: '700' }, helper: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 12 }, primaryButton: { alignItems: 'center', backgroundColor: '#34d399', borderRadius: 12, padding: 14 }, primaryLabel: { color: '#022c22', fontSize: 12, fontWeight: '900' }, error: { backgroundColor: '#451a1a', borderRadius: 10, color: '#fecaca', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, success: { backgroundColor: '#064e3b', borderRadius: 10, color: '#d1fae5', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, item: { alignItems: 'center', borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }, itemCopy: { flex: 1, paddingRight: 8 }, itemTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '800' }, itemMeta: { color: '#94a3b8', fontSize: 11, marginTop: 4 }, evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, evidenceImage: { borderRadius: 8, height: 88, width: 88 }, evidenceLink: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', marginTop: 6 }, status: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
})
