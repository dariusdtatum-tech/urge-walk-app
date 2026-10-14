import { View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { todayISO } from '../../lib/cleanTime.js'
import { passedDayKeys, passedRuns } from '../../lib/dayRuns.js'
import { RANGES, RANGE_IDS, bucketCounts, chartPoints, rangeBuckets, rangeStats, smoothPath, threeDayAverage } from '../../lib/homeStats.js'
import { Card } from '../../ui/Row.jsx'
import { Seg } from '../../ui/Seg.jsx'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

const W = 320
const H = 74
const PAD_TOP = 10
const PAD_BOTTOM = 6

// "Your walks": Week / Month / All time switches only what's inside this card.
// The Streak chip is the clean-day streak and never changes with the range.
export function WalksCard({ walks, range, onRange, streak, now, since }) {
  const { c } = useTheme()
  const stats = rangeStats(walks, range, now)
  const buckets = rangeBuckets(range, now, since)
  const counts = bucketCounts(walks, buckets)
  const values = range === 'month' ? threeDayAverage(counts) : counts
  const mixed = walks.some((w) => w.kind && w.kind !== 'walk')
  const runs = range === 'week' ? passedRuns(buckets.map((b) => todayISO(b.first)), passedDayKeys(walks)) : []
  const caption = mixed ? RANGES[range].captionAll : RANGES[range].caption
  const chips = [
    { id: 'walked', n: stats.walked, label: 'Walked', sub: stats.riddenOut > stats.walked ? `${stats.riddenOut} ridden out` : null },
    { id: 'passed', n: stats.passed, label: 'Passed' },
    ...(streak != null ? [{ id: 'streak', n: streak, label: 'Streak' }] : []),
  ]
  return (
    <Card testID="walks-card">
      <T accessibilityRole="header" font="serif" size={24} color={c.title}>Your walks</T>
      <Seg items={RANGE_IDS.map((id) => ({ id, label: RANGES[id].name }))} value={range} onChange={onRange} label="Walks range" testID="range" small />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {chips.map((ch) => (
          <View key={ch.id} testID={`chip-${ch.id}`} accessible accessibilityLabel={`${ch.n} ${ch.label}${ch.sub ? `, ${ch.sub}` : ''}`}
            style={{ flex: 1, backgroundColor: c.sand, borderRadius: 14, padding: 10, gap: 2 }}>
            <T font="serif" size={28} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{ch.n.toLocaleString()}</T>
            <T font="semibold" size={13} color={c.mutedSand}>{ch.label}</T>
            {ch.sub ? <T size={12} color={c.mutedSand}>{ch.sub}</T> : null}
          </View>
        ))}
      </View>
      <Chart buckets={buckets} counts={values} dots={range === 'week'} runs={runs} />
      {caption ? <T size={13} color={c.muted}>{caption}</T> : null}
    </Card>
  )
}

// The line chart, plus soft brackets over runs of 2+ days with an urge passed (Week only).
function Chart({ buckets, counts, dots, runs }) {
  const { c } = useTheme()
  const n = buckets.length
  const padX = W / (2 * n)
  const { points } = chartPoints(counts, { width: W, height: H, padX, padTop: PAD_TOP, padBottom: PAD_BOTTOM })
  const line = smoothPath(points)
  const baseY = H - PAD_BOTTOM
  const area = points.length > 1 ? `${line} L${points.at(-1).x},${baseY} L${points[0].x},${baseY} Z` : ''
  const total = Math.round(counts.reduce((a, b) => a + b, 0))
  return (
    <View testID="walks-chart">
      {runs.length > 0 ? (
        <View testID="day-runs" style={{ height: 28, position: 'relative' }}>
          {runs.map((r) => (
            <View key={r.start} testID="day-run" accessible
              accessibilityLabel={`${r.length} days in a row with an urge passed, ${buckets[r.start].label} to ${buckets[r.end].label}`}
              style={{ position: 'absolute', left: `${(r.start / n) * 100}%`, width: `${((r.end - r.start + 1) / n) * 100}%`, top: 0, height: 28, paddingHorizontal: 6, alignItems: 'center' }}>
              <T font="semibold" size={12} max={1.3} color={c.accent}>{r.length} days</T>
              <View style={{ alignSelf: 'stretch', height: 8, borderWidth: 1.5, borderBottomWidth: 0, borderColor: c.ringA, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
            </View>
          ))}
        </View>
      ) : null}
      <View accessible accessibilityRole="image" accessibilityLabel={`Urges walked, ${total} in this range`}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.ringB} stopOpacity={0.55} />
              <Stop offset="1" stopColor={c.ringB} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {area ? <Path d={area} fill="url(#chartFill)" /> : null}
          <Path d={line} fill="none" stroke={c.ringA} strokeWidth={2} />
          {points.map((p, i) => (buckets[i].current
            ? <Circle key={i} cx={p.x} cy={p.y} r={4} fill={c.title} />
            : dots ? <Circle key={i} cx={p.x} cy={p.y} r={2.4} fill={c.ringA} /> : null))}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {buckets.map((b, i) => (
          <T key={i} size={11} max={1.3} numberOfLines={1} color={b.current && n <= 7 ? c.title : c.muted}
            style={{ flex: 1, textAlign: n > 7 && i === 0 ? 'left' : n > 7 && i === n - 1 ? 'right' : 'center', overflow: 'visible' }}>
            {b.showLabel ? b.label : ''}
          </T>
        ))}
      </View>
    </View>
  )
}
