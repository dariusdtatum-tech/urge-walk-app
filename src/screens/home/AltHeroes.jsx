// Optional Home hero styles (You → Appearance and lock → Home hero). The ring stays the default; these
// keep clean time as the number on top, and draw a scene that grows from effort (scene state in
// src/lib/scene.js), so a reset never removes anything. VoiceOver reads each as one image with a summary. Coastal palette, flat fills; in dark mode
// text is cream, sea glass is for fills only.
import { createContext, useContext } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'
import { skyTone, tideLevel } from '../../lib/scene.js'
import { T } from '../../ui/Text.jsx'
import { Drift } from './SceneMotion.jsx'
import { SoundButton } from './SoundButton.jsx'
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
const SceneIntro = createContext('')
export const countIntro = (name, days, since) => `${name}: ${plural(days, 'day', 'days')} clean, ${since}.`
function Count({ days, since, name }) {
  const { c } = useTheme()
  return (
    // VoiceOver hears the count as part of the scene card's one label (below), so the header is hidden.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="alt-hero-count">
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
function Panel({ testID, label, left, right, foot, action, children }) {
  const { c } = useTheme()
  const intro = useContext(SceneIntro)
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14, gap: 8, overflow: 'hidden' }}>
      {/* One VoiceOver element for the whole card: the count, then the scene. The art itself is hidden. */}
      <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={`${intro} ${label}`} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <T size={13} color={c.text} style={{ flexShrink: 1 }}>{left}</T>
          {right ? <T size={13} color={c.text} style={{ flexShrink: 1, textAlign: 'right' }}>{right}</T> : null}
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>
        {foot ? <T size={13} color={c.textSoft}>{foot}</T> : null}
      </View>
      {action}
    </View>
  )
}

// A soft sky band at the top of each scene: time of day, or the gentle evening tone after a reset.
function Sky({ scene, W, H }) {
  const { c } = useTheme()
  const t = skyTone(scene)
  return t.opacity ? <Rect x={0} y={0} width={W} height={H} fill={c[t.token]} opacity={t.opacity} /> : null
}

function Tide({ scene, action }) {
  const { c, scheme } = useTheme()
  const W = 320, H = 120, horizon = 18
  const level = H - 10 - tideLevel(scene.growth) * (H - horizon - 14)
  const crest = (y, amp) => `M0 ${y} C ${W * 0.2} ${y - amp}, ${W * 0.35} ${y + amp}, ${W * 0.55} ${y} S ${W * 0.85} ${y - amp}, ${W} ${y}`
  const wave = (y, amp) => `${crest(y, amp)} L ${W} ${H} L 0 ${H} Z`
  return (
    <Panel action={action} testID="alt-hero-tide" label={tideSummary(scene)} left="Tide line" right={plural(scene.ridden, 'urge ridden out', 'urges ridden out')}>
      <View style={{ height: H, overflow: 'hidden' }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Sky scene={scene} W={W} H={level} />
        </Svg>
        <Drift testID="tide-drift">
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Path d={wave(level + 8, 5)} fill={c.ringA} opacity={0.45} />
            <Path d={wave(level, 7)} fill={c.ringA} />
            {/* Wave-crest hairlines just above the water: the high-water mark, nothing to drag. */}
            <Path d={crest(level - 7, 5)} stroke={scheme === 'dark' ? c.text : c.accent} strokeWidth={1} fill="none" />
            <Path d={crest(level - 15, 4)} stroke={scheme === 'dark' ? c.text : c.accent} strokeWidth={1} strokeOpacity={0.55} fill="none" />
          </Svg>
        </Drift>
      </View>
    </Panel>
  )
}

function Stones({ scene, action }) {
  const { c } = useTheme()
  const { shown, cols, total } = stonesLayout(scene)
  const gap = 24, W = cols * gap, rows = Math.ceil(total / cols), H = rows * 28
  const tilt = (i) => ((i * 37) % 23) - 11
  const rx = (i) => 8 + ((i * 7) % 4)
  // Earned stones in a few calm tones; stones still to come are flat, borderless sand dimples.
  const tones = [c.title, c.textSoft, c.muted, c.ringA]
  return (
    <Panel action={action} testID="alt-hero-stones" label={stonesSummary(scene)} left={`${plural(scene.ridden, 'stone', 'stones')}, one per urge ridden out`} foot="Each urge you ride out adds a stone.">
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Sky scene={scene} W={W} H={H} />
        {Array.from({ length: total }, (_, i) => {
          const x = (i % cols) * gap + gap / 2, y = Math.floor(i / cols) * 28 + 14
          const done = i < shown
          return (
            <G key={i} transform={`rotate(${tilt(i)} ${x} ${y})`}>
              <Ellipse cx={x} cy={y} rx={rx(i)} ry={7.5} fill={done ? tones[(i * 7) % tones.length] : c.sand} />
            </G>
          )
        })}
      </Svg>
    </Panel>
  )
}

// A smooth winding footpath (Catmull-Rom through a few points, sampled finely); footprints fill it one walk at a time.
const KNOTS = [[16, 128], [70, 116], [104, 92], [96, 66], [140, 48], [200, 56], [252, 36], [304, 18]]
const TRAIL = (() => {
  const out = []
  const P = [KNOTS[0], ...KNOTS, KNOTS.at(-1)]
  for (let i = 1; i < P.length - 2; i += 1) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    for (let t = 0; t < 1; t += 0.1) {
      const t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)))
    }
  }
  out.push(KNOTS.at(-1))
  return out
})()
const SEG = TRAIL.slice(1).map((q, i) => Math.hypot(q[0] - TRAIL[i][0], q[1] - TRAIL[i][1]))
const LEN = SEG.reduce((a, b) => a + b, 0)
// The point a fraction f along the path, and the path up to it.
function along(f) {
  let at = Math.max(0, Math.min(1, f)) * LEN
  for (let i = 0; i < SEG.length; i += 1) {
    if (at <= SEG[i] || i === SEG.length - 1) { const k = Math.min(1, at / SEG[i]); const a = TRAIL[i], b = TRAIL[i + 1]; return { pt: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], upto: i } }
    at -= SEG[i]
  }
  return { pt: TRAIL[0], upto: 0 }
}
const pathOf = (pts) => 'M ' + pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L ')

function Trail({ scene, action }) {
  const { c, scheme } = useTheme()
  const { section, steps, toPost } = trailSteps(scene)
  const W = 320, H = 150
  const at = (i) => along(i / TRAIL_SECTION).pt
  const here = along(steps / TRAIL_SECTION)
  const you = here.pt
  const walked = pathOf([...TRAIL.slice(0, here.upto + 1), you])
  const walkedColor = scheme === 'dark' ? c.ringA : c.title
  const post = scheme === 'dark' ? c.text : c.title
  return (
    <Panel action={action} testID="alt-hero-trail" label={trailSummary(scene)} left={section > 1 ? `Your trail, section ${section}` : 'Your trail'} right={`Next post: ${plural(toPost, 'walk', 'walks')}`}>
      <View style={{ height: H, overflow: 'hidden' }}>
      <Drift testID="trail-drift">
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Path d={`M0 ${H - 18} C 90 ${H - 38}, 160 ${H}, ${W} ${H - 28} L ${W} ${H} L 0 ${H} Z`} fill={c.ringA} opacity={0.35} />
        </Svg>
      </Drift>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Sky scene={scene} W={W} H={H} />
        <Path d={pathOf(TRAIL)} stroke={c.fieldBorder} strokeWidth={1} fill="none" strokeLinecap="round" />
        {steps > 0 ? <Path d={walked} stroke={walkedColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {Array.from({ length: TRAIL_SECTION / TRAIL_POST }, (_, k) => {
          const [x, y] = at((k + 1) * TRAIL_POST)
          const done = steps >= (k + 1) * TRAIL_POST
          return (
            // A simple wooden trail post: a rounded timber tick beside the path.
            <Rect key={`p${k}`} x={x + 5} y={y - 13} width={2.5} height={11} rx={1.25} fill={done ? post : c.fieldBorder} />
          )
        })}
        {Array.from({ length: steps }, (_, i) => { const [x, y] = at(i + 0.5); return <Ellipse key={i} cx={x + (i % 2 ? 3 : -3)} cy={y} rx={2.2} ry={3.2} fill={walkedColor} /> })}
        <Circle cx={you[0]} cy={you[1]} r={8} fill={c.ringA} stroke={c.bg} strokeWidth={3} />
      </Svg>
      </View>
    </Panel>
  )
}

const VIEWS = { tide: Tide, stones: Stones, trail: Trail }
export function AltHero({ kind, scene, since, name }) {
  const Art = VIEWS[kind] ?? Tide
  return (
    <SceneIntro.Provider value={countIntro(name, scene.days, since)}>
      <View style={{ gap: 14 }} testID={`alt-hero-${kind}-wrap`}>
        <Count days={scene.days} since={since} name={name} />
        <Art scene={scene} action={<SoundButton heroStyle={kind} />} />
      </View>
    </SceneIntro.Provider>
  )
}
export const isAltHero = (kind) => Boolean(VIEWS[kind])
