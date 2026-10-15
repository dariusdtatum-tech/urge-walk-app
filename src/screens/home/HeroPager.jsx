import { useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { cleanTime, cleanTimeLabel, milestoneCards, timeBack } from '../../lib/homeIdeas.js'
import { Ring } from '../../ui/Ring.jsx'
import { T } from '../../ui/Text.jsx'
import { MAX_SCALE, size as sz, type, useTheme } from '../../ui/theme.js'

// Home hero (fuller Home, Oct 2026). ONLY the ring swipes. Its pages change only what's inside the ring:
//   1. days clean   2. days and hours ("163d 7h")   3. Time back in estimated hours (only when the
//   time-back estimate is set; otherwise there are 2 pages).
// Nothing milestone-related goes inside the ring: the fixed Last / Next milestone pair sits below the dots.
export const pageAt = (x, width, count = 2) => Math.max(0, Math.min(count - 1, Math.round(x / Math.max(1, width))))
export const ringPages = (profile, hero, today) => (timeBack(profile, hero, today) ? ['days', 'hours', 'timeback'] : ['days', 'hours'])
export const pagesLabel = (page, count) => `Clean time, page ${page + 1} of ${count}`

export function HeroPager({ hero, days, since, segment, milestones, today, profile, now }) {
  const { c, scheme } = useTheme()
  const [page, setPage] = useState(0)
  const track = useRef(null)
  const pages = ringPages(profile, hero, today)
  const n = pages.length
  const ct = { ...cleanTime(hero, now), days }
  const tb = timeBack(profile, hero, today)
  const cards = milestoneCards(hero, milestones, today)
  const W = sz.ring + 24 // the pager is only as wide as the ring
  // Small labels: deep sea on cream; cream on night (sea glass is for fills only in dark).
  const labelColor = scheme === 'dark' ? c.text : c.accent

  function go(i) {
    const to = Math.max(0, Math.min(n - 1, i))
    setPage(to)
    track.current?.scrollTo?.({ x: to * W, animated: true })
  }
  const pageStyle = { width: W, alignItems: 'center', justifyContent: 'center', minHeight: sz.ring + 8 }
  const vis = (i) => ({ importantForAccessibility: page === i ? 'auto' : 'no-hide-descendants', accessibilityElementsHidden: page !== i })
  const small = { size: type.ringName, max: MAX_SCALE.ringSmall, color: labelColor, style: { letterSpacing: 2, textTransform: 'uppercase' } }

  return (
    <View style={{ gap: 12 }} testID="hero">
      <View style={{ alignItems: 'center' }}>
        {/* Snap to the page width, lock to one direction so Home's vertical scroll still wins on up/down
            drags, and track the page while scrolling because momentum-end doesn't always fire. */}
        <ScrollView ref={track} horizontal pagingEnabled snapToInterval={W} snapToAlignment="start" decelerationRate="fast"
          disableIntervalMomentum directionalLockEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={32} testID="hero-pager"
          style={{ width: W, flexGrow: 0 }} contentContainerStyle={{ width: W * n }}
          onScroll={(e) => { const i = pageAt(e.nativeEvent.contentOffset.x, W, n); if (i !== page) setPage(i) }}
          onMomentumScrollEnd={(e) => { const i = pageAt(e.nativeEvent.contentOffset.x, W, n); if (i !== page) setPage(i) }}>
          <View style={pageStyle} {...vis(0)}>
            <Ring value={segment.progress} testID="hero-ring">
              <T font="bold" {...small} numberOfLines={1} accessibilityLabel={hero.name}>{hero.name}</T>
              <T font="serif" size={days > 99999 ? type.ringDaysSm : days > 999 ? type.ringDaysMd : type.ringDays} max={MAX_SCALE.ring} color={c.title} testID="hero-days"
                accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} clean`} style={{ lineHeight: type.ringDays + 4, fontVariant: ['lining-nums', 'tabular-nums'] }}>{days.toLocaleString()}</T>
              <T font="serifItalic" size={type.ringLabel} max={MAX_SCALE.ringSmall} color={c.title}>{days === 1 ? 'day clean' : 'days clean'}</T>
              <T size={12} max={MAX_SCALE.ringSmall} color={c.muted}>{since}</T>
            </Ring>
          </View>
          <View style={pageStyle} testID="clean-time" {...vis(1)}>
            <Ring value={segment.progress}>
              <T font="bold" {...small}>Clean for</T>
              <View accessible accessibilityLabel={cleanTimeLabel(ct)} testID="clean-time-value">
                <T font="serif" size={type.ringDaysMd} max={MAX_SCALE.ring} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{ct.days.toLocaleString()}d {ct.hours}h</T>
              </View>
              <T font="serifItalic" size={type.ringLabel} max={MAX_SCALE.ringSmall} color={c.title}>days and hours</T>
            </Ring>
          </View>
          {tb ? (
            <View style={pageStyle} testID="ring-timeback" {...vis(2)}>
              <Ring value={segment.progress}>
                <T font="bold" {...small}>Time back</T>
                <T font="serif" size={type.ringDays} max={MAX_SCALE.ring} color={c.title} accessibilityLabel={`About ${tb.hours} hours back, estimated`}
                  style={{ lineHeight: type.ringDays + 4, fontVariant: ['lining-nums', 'tabular-nums'] }} testID="ring-timeback-hours">{tb.hours.toLocaleString()}</T>
                <T font="serifItalic" size={type.ringLabel} max={MAX_SCALE.ringSmall} color={c.title}>hours</T>
                <T size={12} max={MAX_SCALE.ringSmall} color={c.muted}>estimated</T>
              </Ring>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Page dots directly under the ring: the active one is a short pill. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center' }} testID="hero-tabs" accessible accessibilityRole="adjustable"
        accessibilityLabel={pagesLabel(page, n)}
        accessibilityActions={[{ name: 'increment', label: 'Next page' }, { name: 'decrement', label: 'Previous page' }]}
        onAccessibilityAction={(e) => go(page + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}>
        {pages.map((id, i) => (
          <Pressable key={id} onPress={() => go(i)} testID={`pager-dot-${i}`} accessible={false}
            style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: page === i ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: page === i ? c.tabActive : c.fieldBorder }} />
          </Pressable>
        ))}
      </View>

      {/* Fixed milestone pair: always visible, never inside the ring. */}
      <View style={{ flexDirection: 'row', gap: 10 }} testID="milestone-cards">
        <MsCard testID="ms-last" k="Last milestone" name={cards.last ? cards.last.name : 'Not yet'}
          sub={cards.last ? (cards.last.earlier ? 'reached · earlier count' : 'reached') : 'Your first is 7 days'} />
        <MsCard testID="ms-next" k="Next" name={cards.next.name} sub={`in ${cards.next.inDays} ${cards.next.inDays === 1 ? 'day' : 'days'}`} progress={cards.next.progress} />
      </View>
    </View>
  )
}

function MsCard({ k, name, sub, progress, testID }) {
  const { c } = useTheme()
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, gap: 2 }}>
      <T size={13} color={c.textSoft}>{k}</T>
      <T font="semibold" size={type.bodyLg} color={c.title}>{name}</T>
      <T size={13} color={c.textSoft}>{sub}</T>
      {progress != null ? (
        <View accessibilityRole="progressbar" accessibilityLabel={`Progress to ${name}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={{ height: 4, borderRadius: 2, backgroundColor: c.ringTrack, overflow: 'hidden', marginTop: 8, borderWidth: c.trackEdge ? 0.5 : 0, borderColor: c.trackEdge ?? 'transparent' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 4, backgroundColor: c.ringA }} />
        </View>
      ) : null}
    </View>
  )
}
