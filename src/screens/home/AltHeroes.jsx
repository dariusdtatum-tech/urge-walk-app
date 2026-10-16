// Optional Home hero styles (You → Appearance and lock → Home hero). The ring stays the default; these
// show the same count another way. Each is a still picture (no motion, so Reduce Motion has nothing to
// stop), read by VoiceOver as one image with a plain summary. Coastal palette, flat fills; in dark mode
// text is cream, sea glass is for fills only.
import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg'
import { milestoneName, previousMilestone, ringSegment } from '../../lib/milestones.js'
import { T } from '../../ui/Text.jsx'
import { MAX_SCALE, type, useTheme } from '../../ui/theme.js'

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

// ---- pure helpers (tested) ----
export function tideSummary(days) {
  const s = ringSegment(days)
  return `Tide: ${Math.round(s.progress * 100)}% of the way to ${milestoneName(s.next)}, ${plural(s.remaining, 'day', 'days')} to go`
}

export function stonesLayout(days) {
  const d = Math.max(0, Math.floor(days) || 0)
  const weeks = Math.floor(d / 7)
  const cols = 13 // a season per row
  const total = Math.max(26, Math.ceil((weeks + 1) / cols) * cols)
  return { weeks, part: (d % 7) / 7, cols, total }
}
export function stonesSummary(days) {
  const { weeks, part } = stonesLayout(days)
  const left = Math.round((1 - part) * 7)
  return `Stones: ${plural(weeks, 'stone', 'stones')}, one for each week clean. This week’s stone fills in ${plural(left, 'more day', 'more days')}`
}

// The trail shows the last few milestone posts up to the next one, with "you" between the last two.
export function trailPosts(days, count = 7) {
  const s = ringSegment(days)
  const posts = [s.next]
  while (posts.length < count && posts[0] > 0) posts.unshift(previousMilestone(posts[0]))
  return { posts, next: s.next, progress: s.progress }
}
export function trailSummary(days) {
  const s = ringSegment(days)
  return `Trail: walking toward the ${milestoneName(s.next)} post, ${plural(s.remaining, 'day', 'days')} away`
}

// ---- views ----
function Count({ days, since, name }) {
  const { c } = useTheme()
  return (
    <View accessible accessibilityLabel={`${name}. ${plural(days, 'day', 'days')} clean. ${since}`} testID="alt-hero-count">
      <T font="bold" size={type.ringName} max={MAX_SCALE.ringSmall} color={c.text} numberOfLines={1} style={{ letterSpacing: 2, textTransform: 'uppercase' }}>{name}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T font="serif" size={64} max={MAX_SCALE.ring} color={c.title} testID="hero-days" style={{ lineHeight: 70, fontVariant: ['lining-nums'] }}>{days.toLocaleString()}</T>
        <T font="serifItalic" size={22} max={MAX_SCALE.ringSmall} color={c.title}>{days === 1 ? 'day clean' : 'days clean'}</T>
      </View>
      <T size={12} max={MAX_SCALE.ringSmall} color={c.muted}>{since}</T>
    </View>
  )
}

// A card with a caption row above the picture, so labels never sit on top of the drawing.
function Panel({ testID, label, left, right, foot, children }) {
  const { c } = useTheme()
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14, gap: 8, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <T size={13} color={c.text} style={{ flexShrink: 1 }}>{left}</T>
        {right ? <T size={13} color={c.text} style={{ flexShrink: 1, textAlign: 'right' }}>{right}</T> : null}
      </View>
      {children}
      {foot ? <T size={13} color={c.textSoft}>{foot}</T> : null}
    </View>
  )
}

function Tide({ days }) {
  const { c } = useTheme()
  const s = ringSegment(days)
  const W = 320, H = 120, horizon = 18
  const level = H - 10 - s.progress * (H - horizon - 14)
  const wave = (y, amp) => `M0 ${y} C ${W * 0.2} ${y - amp}, ${W * 0.35} ${y + amp}, ${W * 0.55} ${y} S ${W * 0.85} ${y - amp}, ${W} ${y} L ${W} ${H} L 0 ${H} Z`
  return (
    <Panel testID="alt-hero-tide" label={tideSummary(days)} left={`Tide line: ${milestoneName(s.next)}`} right={plural(s.remaining, 'day to go', 'days to go')}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={0} x2={W} y1={horizon} y2={horizon} stroke={c.text} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 5" />
        <Circle cx={W - 28} cy={horizon} r={9} fill={c.title} />
        <Path d={wave(level + 8, 5)} fill={c.ringA} opacity={0.45} />
        <Path d={wave(level, 7)} fill={c.ringA} />
      </Svg>
    </Panel>
  )
}

function Stones({ days }) {
  const { c } = useTheme()
  const { weeks, part, cols, total } = stonesLayout(days)
  const gap = 24, W = cols * gap, rows = Math.ceil(total / cols), H = rows * 28
  const tilt = (i) => ((i * 37) % 23) - 11
  const rx = (i) => 8 + ((i * 7) % 4)
  return (
    <Panel testID="alt-hero-stones" label={stonesSummary(days)} left={`${plural(weeks, 'week', 'weeks')}, one stone each`} foot="This week’s stone fills in a little each day.">
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {Array.from({ length: total }, (_, i) => {
          const x = (i % cols) * gap + gap / 2, y = Math.floor(i / cols) * 28 + 14
          const done = i < weeks, now = i === weeks
          return (
            <G key={i} transform={`rotate(${tilt(i)} ${x} ${y})`}>
              <Ellipse cx={x} cy={y} rx={rx(i)} ry={7.5} fill={done ? c.title : 'none'} opacity={done ? 0.6 + ((i * 13) % 5) / 12 : 1}
                stroke={done ? 'none' : c.fieldBorder} strokeWidth={1.2} strokeDasharray={now ? undefined : '2 3'} />
              {now && part > 0 ? <Ellipse cx={x} cy={y} rx={rx(i) * part} ry={7.5 * part} fill={c.ringA} /> : null}
            </G>
          )
        })}
      </Svg>
    </Panel>
  )
}

const TRAIL = [[16, 128], [64, 118], [104, 90], [78, 64], [128, 46], [196, 58], [250, 34], [300, 16]]
function Trail({ days }) {
  const { c } = useTheme()
  const { posts, next, progress } = trailPosts(days)
  const W = 320, H = 150
  const pts = TRAIL.slice(TRAIL.length - posts.length)
  const k = posts.length - 2 // you are between the last two posts
  const a = pts[k], b = pts[k + 1]
  const you = [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress]
  const line = (p) => 'M ' + p.map((q) => q.join(' ')).join(' L ')
  return (
    <Panel testID="alt-hero-trail" label={trailSummary(days)} left="Your trail" right={`Next post: ${milestoneName(next)}`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={`M0 ${H - 18} C 90 ${H - 38}, 160 ${H}, ${W} ${H - 28} L ${W} ${H} L 0 ${H} Z`} fill={c.ringA} opacity={0.35} />
        <Path d={line(pts)} stroke={c.fieldBorder} strokeWidth={2} fill="none" strokeDasharray="3 6" strokeLinecap="round" />
        <Path d={line([...pts.slice(0, k + 1), you])} stroke={c.title} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {posts.map((m, i) => {
          const [x, y] = pts[i]
          const done = m <= days
          return (
            <G key={m}>
              <Line x1={x} x2={x} y1={y} y2={y - 14} stroke={done ? c.title : c.fieldBorder} strokeWidth={2} />
              <Rect x={x} y={y - 14} width={9} height={6} fill={done ? c.title : 'none'} stroke={done ? 'none' : c.fieldBorder} />
            </G>
          )
        })}
        <Circle cx={you[0]} cy={you[1]} r={8} fill={c.ringA} stroke={c.bg} strokeWidth={3} />
      </Svg>
    </Panel>
  )
}

const VIEWS = { tide: Tide, stones: Stones, trail: Trail }
export function AltHero({ kind, days, since, name }) {
  const View2 = VIEWS[kind] ?? Tide
  return (
    <View style={{ gap: 14 }} testID={`alt-hero-${kind}-wrap`}>
      <Count days={days} since={since} name={name} />
      <View2 days={days} />
    </View>
  )
}
export const isAltHero = (kind) => Boolean(VIEWS[kind])
