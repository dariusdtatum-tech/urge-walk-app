// Track: Log and Journal behind one Log | Journal switch. The title row carries the one compact control
// for the view: Week / Month / All on Log (so the range is visible above the fold) and + New entry on Journal.
import { useState } from 'react'
import { View } from 'react-native'
import { RANGES, RANGE_IDS, loadRange, saveRange } from '../lib/homeStats.js'
import { Seg } from '../ui/Seg.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { type, useTheme } from '../ui/theme.js'
import { JournalScreen } from './JournalScreen.jsx'
import { LogScreen } from './LogScreen.jsx'
import { TrackInsights } from './home/TrackInsights.jsx'

export const TRACK_VIEWS = [{ id: 'log', label: 'Log' }, { id: 'journal', label: 'Journal' }]

export function TrackScreen({ view, onView, now, clock, onRide, focusWalkId, onEditingChange, onOpenWalk }) {
  const { c } = useTheme()
  const storage = useStorage()
  const [range, setRange] = useState(() => loadRange(storage))
  const changeRange = (id) => { setRange(id); saveRange(id, storage) }
  // header(right): the title row with an optional compact control on the right, then the view switch.
  const header = (right = null) => (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} testID="track-title-row">
        <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} style={{ flex: 1 }}>Track</T>
        {right}
      </View>
      <Seg items={TRACK_VIEWS} value={view} onChange={onView} label="Track view" testID="track" />
    </View>
  )
  const rangePill = (
    <Seg items={RANGE_IDS.map((id) => ({ id, label: id === 'all' ? 'All' : RANGES[id].name, a11y: RANGES[id].name }))} value={range} onChange={changeRange} label="Walks range" testID="range" compact />
  )
  return view === 'journal'
    ? <JournalScreen now={now} clock={clock} header={header} onEditingChange={onEditingChange} onOpenWalk={onOpenWalk} />
    : <LogScreen now={now} onRide={onRide} initialSelectedId={focusWalkId} header={header(rangePill)} insights={<TrackInsights now={now} range={range} />} />
}
