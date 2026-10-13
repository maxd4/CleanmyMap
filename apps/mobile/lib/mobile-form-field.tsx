import { StyleSheet, Text, TextInput, View } from 'react-native'

export function MobileFormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'numeric'
  multiline?: boolean
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748b" keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.multiline]} /></View>
}

const styles = StyleSheet.create({
  field: { flex: 1, marginBottom: 12 },
  label: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 10, borderWidth: 1, color: '#f8fafc', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
})
