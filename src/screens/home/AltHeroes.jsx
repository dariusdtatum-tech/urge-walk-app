// Optional Home hero styles (You → Appearance and lock → Home hero). The ring stays the default; these
// keep clean time as the number on top, and draw a scene that grows from effort (scene state in
// src/lib/scene.js), so a reset never removes anything. VoiceOver reads each as one image with a summary. Coastal palette, flat fills; in dark mode
// text is cream, sea glass is for fills only.
import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg'
import { skyTone, tideLevel } from '../../lib/scene.js'
import { T } from '../../ui/Text.jsx'
import { MAX_SCALE, type, useTheme } from '../../ui/theme.js'

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

// ---- pure helpers (tested) ----
// The art reads only the scene's effort counts, so a reset never takes anything away.
export function tideSummary(scene) {
  return `Tide: the water has risen with ${plural(scene.ridden, 'urge', 'urges')} ridden out`
}

export function stonesLayout(scene) {
  const stones = Math.max(0, scene.ridden)
  const cols = 13
  const total = Math.max(26, Math.ceil((stones + 1) / cols) * cols)
  return { stones, cols, total: Math.min(total, 78), shown: Math.min(stones, 78) }
}
export function stonesSummary(scene) {
  return `Stones: ${plural(scene.ridden, 'stone', 'stones')}, one for each urge ridden out`
}

// One footprint per walk along a section of trail; a post every 5 walks; a new section every 30.
export const TRAIL_SECTION = 30
export const TRAIL_POST = 5
export function trailSteps(scene) {
  const n = Math.max(0, scene.walks)
  const section = Math.floor(n / TRAIL_SECTION) + 1
  const steps = n % TRAIL_SECTION
  const toPost = TRAIL_POST - (n % TRAIL_POST)
  return { section, steps, toPost }
}
export function trailSummary(scene) {
  const t = trailSteps(scene)
  return `Trail: ${plural(scene.walks, 'walk', 'walks')} so far, the next post is ${plural(t.toPost, 'walk', 'walks')} away`
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

// A soft sky band at the top of each scene: time of day, or the gentle evening tone after a reset.
function Sky({ scene, W, H }) {
  const { c } = useTheme()
  const t = skyTone(scene)
  return t.opacity ? <Rect x={0} y={0} width={W} height={H} fill={c[t.token]} opacity={t.opacity} /> : null
}

function Tide({ scene }) {
  const { c } = useTheme()
  const W = 320, H = 120, horizon = 18
  const level = H - 10 - tideLevel(scene.growth) * (H - horizon - 14)
  const wave = (y, amp) => `M0 ${y} C ${W * 0.2} ${y - amp}, ${W * 0.35} ${y + amp}, ${W * 0.55} ${y} S ${W * 0.85} ${y - amp}, ${W} ${y} L ${W} ${H} L 0 ${H} Z`
  return (
    <Panel testID="alt-hero-tide" label={tideSummary(scene)} left="Tide line" right={plural(scene.ridden, 'urge ridden out', 'urges ridden out')}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Sky scene={scene} W={W} H={level} />
        <Line x1={0} x2={W} y1={horizon} y2={horizon} stroke={c.text} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 5" />
        <Circle cx={W - 28} cy={horizon} r={9} fill={c.title} />
        <Path d={wave(level + 8, 5)} fill={c.ringA} opacity={0.45} />
        <Path d={wave(level, 7)} fill={c.ringA} />
      </Svg>
    </Panel>
  )
}

function Stones({ scene }) {
  const { c } = useTheme()
  const { shown, cols, total } = stonesLayout(scene)
  const gap = 24, W = cols * gap, rows = Math.ceil(total / cols), H = rows * 28
  const tilt = (i) => ((i * 37) % 23) - 11
  const rx = (i) => 8 + ((i * 7) % 4)
  return (
    <Panel testID="alt-hero-stones" label={stonesSummary(scene)} left={`${plural(scene.ridden, 'stone', 'stones')}, one per urge ridden out`} foot="Each urge you ride out adds a stone.">
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Sky scene={scene} W={W} H={H} />
        {Array.from({ length: total }, (_, i) => {
          const x = (i % cols) * gap + gap / 2, y = Math.floor(i / cols) * 28 + 14
          const done = i < shown
          return (
            <G key={i} transform={`rotate(${tilt(i)} ${x} ${y})`}>
              <Ellipse cx={x} cy={y} rx={rx(i)} ry={7.5} fill={done ? c.title : 'none'} opacity={done ? 0.6 + ((i * 13) % 5) / 12 : 1}
                stroke={done ? 'none' : c.fieldBorder} strokeWidth={1.2} strokeDasharray={done ? undefined : '2 3'} />
            </G>
          )
        })}
      </Svg>
    </Panel>
  )
}

// A fixed winding path; footprints fill it one walk at a time.
const TRAIL = [[16, 128], [64, 118], [104, 90], [78, 64], [128, 46], [196, 58], [250, 34], [300, 16]]
function along(f) {
  const seg = []
  let total = 0
  for (let i = 1; i < TRAIL.length; i += 1) { const d = Math.hypot(TRAIL[i][0] - TRAIL[i - 1][0], TRAIL[i][1] - TRAIL[i - 1][1]); seg.push(d); total += d }
  let at = f * total
  for (let i = 0; i < seg.length; i += 1) {
    if (at <= seg[i] || i === seg.length - 1) { const k = Math.min(1, at / seg[i]); const a = TRAIL[i], b = TRAIL[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] }
    at -= seg[i]
  }
  return TRAIL[0]
}
function Trail({ scene }) {
  const { c } = useTheme()
  const { section, steps, toPost } = trailSteps(scene)
  const W = 320, H = 150
  const line = 'M ' + TRAIL.map((q) => q.join(' ')).join(' L ')
  const at = (i) => along(i / TRAIL_SECTION)
  const you = at(steps)
  return (
    <Panel testID="alt-hero-trail" label={trailSummary(scene)} left={section > 1 ? `Your trail, section ${section}` : 'Your trail'} right={`Next post: ${plural(toPost, 'walk', 'walks')}`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Sky scene={scene} W={W} H={H} />
        <Path d={`M0 ${H - 18} C 90 ${H - 38}, 160 ${H}, ${W} ${H - 28} L ${W} ${H} L 0 ${H} Z`} fill={c.ringA} opacity={0.35} />
        <Path d={line} stroke={c.fieldBorder} strokeWidth={2} fill="none" strokeDasharray="3 6" strokeLinecap="round" />
        {Array.from({ length: TRAIL_SECTION / TRAIL_POST }, (_, k) => {
          const [x, y] = at((k + 1) * TRAIL_POST)
          const done = steps >= (k + 1) * TRAIL_POST
          return (
            <G key={`p${k}`}>
              <Line x1={x} x2={x} y1={y} y2={y - 14} stroke={done ? c.title : c.fieldBorder} strokeWidth={2} />
              <Rect x={x} y={y - 14} width={9} height={6} fill={done ? c.title : 'none'} stroke={done ? 'none' : c.fieldBorder} />
            </G>
          )
        })}
        {Array.from({ length: steps }, (_, i) => { const [x, y] = at(i + 0.5); return <Ellipse key={i} cx={x + (i % 2 ? 3 : -3)} cy={y} rx={2.2} ry={3.2} fill={c.title} /> })}
        <Circle cx={you[0]} cy={you[1]} r={8} fill={c.ringA} stroke={c.bg} strokeWidth={3} />
      </Svg>
    </Panel>
  )
}

const VIEWS = { tide: Tide, stones: Stones, trail: Trail }
export function AltHero({ kind, scene, since, name }) {
  const Art = VIEWS[kind] ?? Tide
  return (
    <View style={{ gap: 14 }} testID={`alt-hero-${kind}-wrap`}>
      <Count days={scene.days} since={since} name={name} />
      <Art scene={scene} />
    </View>
  )
}
export const isAltHero = (kind) => Boolean(VIEWS[kind])
