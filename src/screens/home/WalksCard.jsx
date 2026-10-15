import { View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { todayISO } from '../../lib/cleanTime.js'
import { passedDayKeys, passedDaysIn } from '../../lib/dayRuns.js'
import { RANGES, RANGE_IDS, bucketCounts, chartPoints, rangeBuckets, rangeStats, smoothPath, threeDayAverage } from '../../lib/homeStats.js'
import { Card } from '../../ui/Row.jsx'
import { Seg } from '../../ui/Seg.jsx'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

const W = 320
const H = 74
const PAD_TOP = 10
const PAD_BOTTOM = 6

// "Your walks": Week / Month / All time switches only what's inside this card.
// The third chip is the average walk length in the range (no streak wording here).
export function WalksCard({ walks, range, onRange, now, since }) {
  const { c } = useTheme()
  const stats = rangeStats(walks, range, now)
  const buckets = rangeBuckets(range, now, since)
  const counts = bucketCounts(walks, buckets)
  const values = range === 'month' ? threeDayAverage(counts) : counts
  const mixed = walks.some((w) => w.kind && w.kind !== 'walk')
  const passedDays = range === 'week' ? passedDaysIn(buckets.map((b) => todayISO(b.first)), passedDayKeys(walks)) : null
  const caption = mixed ? RANGES[range].captionAll : RANGES[range].caption
  const chips = [
    { id: 'walked', n: stats.walked, label: 'Walked', sub: stats.riddenOut > stats.walked ? `${stats.riddenOut} ridden out` : null },
    { id: 'passed', n: stats.passed, label: 'Passed' },
    avgChip(stats.avgWalkSeconds),
  ]
  return (
    <Card testID="walks-card">
      <T accessibilityRole="header" font="serif" size={24} color={c.title}>Your walks</T>
      <Seg items={RANGE_IDS.map((id) => ({ id, label: RANGES[id].name }))} value={range} onChange={onRange} label="Walks range" testID="range" small />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {chips.map((ch) => (
          <View key={ch.id} testID={`chip-${ch.id}`} accessible accessibilityLabel={ch.a11y ?? `${ch.n} ${ch.label}${ch.sub ? `, ${ch.sub}` : ''}`}
            style={{ flex: 1, backgroundColor: c.sand, borderRadius: 14, padding: 10, gap: 2 }}>
            <T font="serif" size={28} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{ch.n.toLocaleString()}</T>
            <T font="semibold" size={13} color={c.mutedSand}>{ch.label}</T>
            {ch.sub ? <T size={12} color={c.mutedSand}>{ch.sub}</T> : null}
          </View>
        ))}
      </View>
      {passedDays != null ? (
        <View testID="week-passed-days" accessible accessibilityLabel={`${passedDays} ${passedDays === 1 ? 'day' : 'days'} with an urge passed this week`}
          style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T font="serif" size={type.rideSheetTitle} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{passedDays}</T>
          <T font="bold" size={15} color={c.title}>{passedDays === 1 ? 'day' : 'days'} with an urge passed</T>
        </View>
      ) : null}
      <Chart buckets={buckets} counts={values} dots={range === 'week'} />
      {caption ? <T size={13} color={c.muted}>{caption}</T> : null}
    </Card>
  )
}

// Average walk, in whole minutes (at least 1 once there's a timed walk).
export function avgChip(secs) {
  if (secs == null) return { id: 'avg', n: '–', label: 'Avg walk', a11y: 'Average walk: no timed walks yet' }
  const m = Math.max(1, Math.round(secs / 60))
  return { id: 'avg', n: m, label: 'Avg walk', sub: m === 1 ? 'minute' : 'minutes', a11y: `Average walk ${m} ${m === 1 ? 'minute' : 'minutes'}` }
}

// The line chart. No run brackets: an empty day is just a low point, never a gap.
function Chart({ buckets, counts, dots }) {
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
          <T key={i} size={type.caption} max={1.3} numberOfLines={1} color={b.current && n <= 7 ? c.title : c.muted}
            style={{ flex: 1, textAlign: n > 7 && i === 0 ? 'left' : n > 7 && i === n - 1 ? 'right' : 'center', overflow: 'visible' }}>
            {b.showLabel ? b.label : ''}
          </T>
        ))}
      </View>
    </View>
  )
}
