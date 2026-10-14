// Opened from the "Checking in" notification: three calm answers, saved to that urge's entry.
import { View } from 'react-native'
import { FOLLOWUP_LABELS } from '../lib/followUp.js'
import { Button } from '../ui/Button.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'

export function FollowUpSheet({ onAnswer, onClose }) {
  const { c } = useTheme()
  return (
    <Sheet title="Checking in" onClose={onClose} testID="followup-sheet">
      <T size={17} color={c.text}>How’s it going since that urge?</T>
      <View style={{ gap: 10 }}>
        <Button label={FOLLOWUP_LABELS.passed} onPress={() => onAnswer('passed')} testID="followup-passed" />
        <Button kind="secondary" label={FOLLOWUP_LABELS.tough} onPress={() => onAnswer('tough')} testID="followup-tough" />
        <Button kind="quiet" label={FOLLOWUP_LABELS.skip} onPress={() => onAnswer('skip')} testID="followup-skip" />
      </View>
      <T size={14} color={c.muted}>“Still tough” opens Ride it out again.</T>
    </Sheet>
  )
}
