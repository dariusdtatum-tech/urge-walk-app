// Crisis resources: from You → Help now, and straight away when "Self-harm urges" is picked in setup.
import { View } from 'react-native'
import { Button } from '../ui/Button.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'

// US crisis lines (public numbers). Each opens the phone's own dialer / messages.
export const CRISIS = [
  { id: '988', name: '988 Suicide & Crisis Lifeline', note: 'Free, 24/7. Call or text 988.', links: [{ label: 'Call 988', url: 'tel:988' }, { label: 'Text 988', url: 'sms:988' }] },
  { id: 'samhsa', name: 'SAMHSA National Helpline', note: 'Free, confidential, 24/7. Treatment referral and information.', links: [{ label: 'Call 1-800-662-4357', url: 'tel:18006624357' }] },
  { id: '911', name: 'Emergency', note: 'If you or someone else is in immediate danger.', links: [{ label: 'Call 911', url: 'tel:911' }] },
]
export function CrisisSheet({ onClose }) {
  const { c } = useTheme()
  const device = useDevice()
  return (
    <Sheet title="Crisis resources" onClose={onClose} testID="crisis-sheet" right={<HeaderButton label="✕" accessibilityLabel="Close" onPress={onClose} />}>
      <T size={16} color={c.text}>If you’re struggling, you don’t have to ride it out alone. Reach out now.</T>
      {CRISIS.map((r) => (
        <View key={r.id} testID={`crisis-${r.id}`} style={{ gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <T font="semibold" size={16} color={c.title}>{r.name}</T>
          <T size={14} color={c.muted}>{r.note}</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {r.links.map((l) => <Button key={l.url} kind="secondary" label={l.label} onPress={() => device.openURL(l.url)} testID={`crisis-link-${l.url}`} />)}
          </View>
        </View>
      ))}
      <T size={14} color={c.muted} testID="crisis-disclaimer">Urge Walk is a habit tool, not treatment or a substitute for professional care.</T>
    </Sheet>
  )
}
