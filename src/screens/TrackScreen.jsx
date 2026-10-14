// Track: Log and Journal behind one Log | Journal switch.
import { View } from 'react-native'
import { Seg } from '../ui/Seg.jsx'
import { T } from '../ui/Text.jsx'
import { type, useTheme } from '../ui/theme.js'
import { JournalScreen } from './JournalScreen.jsx'
import { LogScreen } from './LogScreen.jsx'

export const TRACK_VIEWS = [{ id: 'log', label: 'Log' }, { id: 'journal', label: 'Journal' }]

export function TrackScreen({ view, onView, now, clock, onRide, focusWalkId, onEditingChange, onOpenWalk }) {
  const { c } = useTheme()
  const header = (
    <View style={{ gap: 12 }}>
      <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Track</T>
      <Seg items={TRACK_VIEWS} value={view} onChange={onView} label="Track view" testID="track" />
    </View>
  )
  return view === 'journal'
    ? <JournalScreen now={now} clock={clock} header={header} onEditingChange={onEditingChange} onOpenWalk={onOpenWalk} />
    : <LogScreen now={now} onRide={onRide} initialSelectedId={focusWalkId} header={header} />
}
