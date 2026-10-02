import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  clearStoredEmergencyContact,
  getStoredEmergencyContact,
  saveStoredEmergencyContact,
} from '../lib/storage'
import { validateEmergencyContact } from '../lib/emergency-contact'
import type { EmergencyContact } from '../types/emergency-contact'

const emptyContact: EmergencyContact = { name: '', relation: '', phone: '' }

export function EmergencyContactPanel() {
  const [contact, setContact] = useState<EmergencyContact | null>(null)
  const [draft, setDraft] = useState<EmergencyContact>(emptyContact)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getStoredEmergencyContact().then((storedContact) => {
      if (cancelled) return
      setContact(storedContact)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  function beginCreate() {
    setDraft(emptyContact)
    setError(null)
    setEditing(true)
  }

  function beginEdit(value: EmergencyContact) {
    setDraft(value)
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    const normalized: EmergencyContact = {
      name: draft.name.trim(),
      relation: draft.relation.trim(),
      phone: draft.phone.trim(),
    }
    const validationErrors = validateEmergencyContact(normalized)
    const firstError = validationErrors.name ?? validationErrors.relation ?? validationErrors.phone
    if (firstError) {
      setError(firstError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await saveStoredEmergencyContact(normalized)
      setContact(normalized)
      setDraft(normalized)
      setEditing(false)
    } catch {
      setError('Impossible d’enregistrer le contact sur cet appareil.')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!contact) return

    Alert.alert(
      'Supprimer le contact ?',
      'Ce contact privé sera supprimé de cet appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void deleteContact() },
      ],
    )
  }

  async function deleteContact() {
    try {
      await clearStoredEmergencyContact()
      setContact(null)
      setDraft(emptyContact)
      setEditing(false)
      setError(null)
    } catch {
      setError('Impossible de supprimer le contact sur cet appareil.')
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#34d399" />
  }

  if (editing) {
    return <EmergencyContactEditor draft={draft} error={error} saving={saving} onChange={setDraft} onSave={handleSave} onCancel={() => setEditing(false)} />
  }

  if (!contact) {
    return <EmptyEmergencyContact onCreate={beginCreate} />
  }

  return <SavedEmergencyContact contact={contact} error={error} onEdit={() => beginEdit(contact)} onDelete={handleDelete} />
}

function ContactPanelHeader({ description }: { description: string }) {
  return (
    <View style={styles.panelHeader}>
      <Ionicons name="shield-checkmark-outline" size={24} color="#34d399" />
      <View style={styles.copy}>
        <Text style={styles.title}>Contact d’urgence</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  )
}

function EmergencyContactEditor({
  draft,
  error,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: EmergencyContact
  error: string | null
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<EmergencyContact>>
  onSave: () => void | Promise<void>
  onCancel: () => void
}) {
  return (
    <View style={styles.panel}>
      <ContactPanelHeader description="Un seul contact, conservé uniquement sur cet appareil." />
      <ContactField label="Nom" value={draft.name} onChangeText={(name) => onChange((current) => ({ ...current, name }))} placeholder="Ex. Marie Dupont" autoComplete="name" />
      <ContactField label="Relation" value={draft.relation} onChangeText={(relation) => onChange((current) => ({ ...current, relation }))} placeholder="Ex. sœur, ami, parent" />
      <ContactField label="Numéro de téléphone" value={draft.phone} onChangeText={(phone) => onChange((current) => ({ ...current, phone }))} placeholder="Ex. 06 12 34 56 78" keyboardType="phone-pad" autoComplete="tel" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primaryButton} onPress={() => void onSave()} disabled={saving}>
        {saving ? <ActivityIndicator color="#022c22" /> : <Text style={styles.primaryButtonLabel}>ENREGISTRER</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={saving}>
        <Text style={styles.secondaryButtonLabel}>ANNULER</Text>
      </TouchableOpacity>
    </View>
  )
}

function EmptyEmergencyContact({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.panel}>
      <ContactPanelHeader description="Ajoutez un contact privé pour pouvoir l’appeler rapidement pendant une mission." />
      <TouchableOpacity style={styles.primaryButton} onPress={onCreate}>
        <Text style={styles.primaryButtonLabel}>AJOUTER UN CONTACT</Text>
      </TouchableOpacity>
    </View>
  )
}

function SavedEmergencyContact({
  contact,
  error,
  onEdit,
  onDelete,
}: {
  contact: EmergencyContact
  error: string | null
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View style={styles.panel}>
      <ContactPanelHeader description="Conservé uniquement sur cet appareil." />
      <View style={styles.contactCard}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactDetail}>{contact.relation}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Text style={styles.actionButtonLabel}>MODIFIER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonLabel}>SUPPRIMER</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function ContactField({
  label,
  value,
  onChangeText,
  placeholder,
  ...props
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'phone-pad'
  autoComplete?: 'name' | 'tel'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  loader: { marginVertical: 24 },
  panel: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  panelHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 18 },
  copy: { flex: 1, marginLeft: 12 },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  description: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  contactCard: { backgroundColor: '#020617', borderRadius: 12, padding: 14 },
  contactName: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  contactDetail: { color: '#a7f3d0', fontSize: 13, marginTop: 4 },
  contactPhone: { color: '#cbd5e1', fontSize: 15, fontWeight: '700', marginTop: 8 },
  field: { marginBottom: 14 },
  fieldLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonLabel: { color: '#022c22', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  secondaryButton: { alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 6 },
  secondaryButtonLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: {
    alignItems: 'center', borderColor: '#334155', borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 12,
  },
  actionButtonLabel: { color: '#a7f3d0', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  deleteButton: { alignItems: 'center', borderColor: '#7f1d1d', borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 12 },
  deleteButtonLabel: { color: '#fca5a5', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
})
