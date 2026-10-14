import { TextInput, View } from 'react-native'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

// A labelled text field (label sits above; the field is 48pt+).
export function Field({ label, value, onChangeText, placeholder, multiline = false, maxLength, testID, keyboardType, autoFocus = false, invalid = false, onBlur, style }) {
  const { c, fonts } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      {label ? <T font="medium" size={14} color={c.muted}>{label}</T> : null}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted}
        multiline={multiline} maxLength={maxLength} testID={testID} keyboardType={keyboardType} autoFocus={autoFocus} onBlur={onBlur}
        accessibilityLabel={label ?? placeholder} maxFontSizeMultiplier={2}
        style={[{ minHeight: multiline ? 88 : 48, borderWidth: 1, borderColor: invalid ? c.error : c.fieldBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: fonts.body, fontSize: 16, textAlignVertical: multiline ? 'top' : 'center', backgroundColor: c.card }, style]} />
    </View>
  )
}
