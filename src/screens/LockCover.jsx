// The app lock's cover: calm, neutral, and 988 is always one tap away (never locked out of help).
// Shown when locked, and while the app is inactive / in the background so the app switcher snapshot
// shows nothing personal.
import { Modal, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CRISIS_LINE } from '../lib/contacts.js'
import { Button } from '../ui/Button.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { WaveIcon } from '../ui/Icons.jsx'
import { Card } from '../ui/Row.jsx'
import { T } from '../ui/Text.jsx'
import { space, type, useTheme } from '../ui/theme.js'
import { SmallButton } from './ReachOut.jsx'

// locked: a full-screen native Modal (nothing behind it is reachable). Not locked (the app is only
// inactive, e.g. the app switcher): a plain view drawn over the app, never a Modal, and it never takes
// touches, so it can't fight a system sheet or get stuck in front of the app.
export function LockCover({ locked = true, unlockable, error, onUnlock }) {
  const { c } = useTheme()
  const device = useDevice()
  const insets = useSafeAreaInsets()
  return (
    <Wrap locked={locked}>
      <View testID="lock-cover" pointerEvents={locked ? 'auto' : 'none'} style={{ flex: 1, backgroundColor: c.bg, padding: space.screen, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <WaveIcon color={c.title} size={28} />
          </View>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Urge Walk is locked</T>
          {unlockable ? (
            <>
              <T size={type.body} color={c.text} style={{ textAlign: 'center' }}>Unlock with Face ID or your passcode.</T>
              <Button label="Unlock" onPress={onUnlock} testID="lock-unlock" style={{ alignSelf: 'stretch', marginTop: 8 }} />
              {error ? <T size={type.sub} color={c.textSoft} accessibilityRole="alert" testID="lock-error" style={{ textAlign: 'center' }}>{error}</T> : null}
            </>
          ) : null}
        </View>
        <Card testID="lock-988" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T font="semibold" size={type.rowTitle} color={c.title}>988 Lifeline</T>
            <T size={type.rowSub} color={c.textSoft}>{CRISIS_LINE.note}</T>
          </View>
          <SmallButton label="Text" accessibilityLabel="Text 988" onPress={() => device.openURL('sms:988')} testID="lock-988-text" />
          <SmallButton label="Call" accessibilityLabel="Call 988" onPress={() => device.openURL('tel:988')} testID="lock-988-call" />
        </Card>
      </View>
    </Wrap>
  )
}

function Wrap({ locked, children }) {
  if (locked) return <Modal visible transparent={false} animationType="none" onRequestClose={() => {}} statusBarTranslucent>{children}</Modal>
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} pointerEvents="none">{children}</View>
}
