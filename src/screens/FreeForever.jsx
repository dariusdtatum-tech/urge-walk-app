import { View } from 'react-native'
import { FREE_FOREVER } from '../lib/entitlements.js'
import { Card, Sheet } from '../ui/kit.jsx'
import { T } from '../ui/Text.jsx'
import { type, useTheme } from '../ui/theme.js'

// The Free forever list (content/free-features.json), with its one promise.
export function FreeForeverSheet({ onClose }) {
  const { c } = useTheme()
  return (
    <Sheet title="Free forever" onClose={onClose} testID="free-sheet">
      <T size={type.body} color={c.text} testID="free-promise">{FREE_FOREVER.promise}</T>
      <Card>
        {FREE_FOREVER.features.map((f) => (
          <View key={f.id} style={{ flexDirection: 'row', gap: 8 }} testID={`free-${f.id}`}>
            <T size={type.body} color={c.accent} accessibilityElementsHidden importantForAccessibility="no">✓</T>
            <T size={type.body} color={c.text} style={{ flex: 1 }}>{f.label}</T>
          </View>
        ))}
      </Card>
      <T size={type.footnote} color={c.muted}>No ads, ever. No account needed.</T>
    </Sheet>
  )
}
