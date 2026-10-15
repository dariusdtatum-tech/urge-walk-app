// The cards that used to sit on Home, now on Track → Log (Option C keeps Home to five things):
// the time-of-day pattern, Never zero, and Your walks (chart + range).
import { useState } from 'react'
import { View } from 'react-native'
import { recentlySaved } from '../../lib/calm.js'
import { todayISO } from '../../lib/cleanTime.js'
import { heroHabit, loadRange, saveRange } from '../../lib/homeStats.js'
import { loadActiveTrackerId } from '../../lib/activeTracker.js'
import { loadHabits } from '../../lib/storage.js'
import { loadWalks } from '../../lib/walkStorage.js'
import { useStorage } from '../../ui/StorageContext.js'
import { space } from '../../ui/theme.js'
import { NeverZero } from './NeverZero.jsx'
import { PatternCard } from './PatternCard.jsx'
import { WalksCard } from './WalksCard.jsx'

export function TrackInsights({ now }) {
  const storage = useStorage()
  const today = todayISO(new Date(now))
  const [walks] = useState(() => loadWalks(storage).walks)
  const [hero] = useState(() => heroHabit(loadHabits(storage).habits, loadActiveTrackerId(storage)))
  const [range, setRange] = useState(() => loadRange(storage))
  const [highlight] = useState(() => recentlySaved(now, storage))
  const firstWalk = walks.reduce((min, w) => (w.startedAt < min ? w.startedAt : min), '9999')
  const since = [hero?.startDate, firstWalk === '9999' ? null : todayISO(new Date(firstWalk))].filter(Boolean).sort()[0] || today
  if (!hero && !walks.length) return null
  return (
    <View style={{ gap: space.section }} testID="track-insights">{/* Urge Map is the one sand panel; the rest are unboxed sections */}
      <PatternCard walks={walks} now={now} />
      {hero ? <NeverZero hero={hero} walks={walks} today={today} highlight={highlight} /> : null}
      <WalksCard walks={walks} range={range} onRange={(id) => { setRange(id); saveRange(id, storage) }} now={now} since={since} />
    </View>
  )
}
