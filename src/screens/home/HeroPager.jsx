import { useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { cleanTime, cleanTimeLabel, dailyLine, milestoneCards, sinceLabel } from '../../lib/homeIdeas.js'
import { Ring } from '../../ui/Ring.jsx'
import { T } from '../../ui/Text.jsx'
import { MAX_SCALE, size as sz, type, useTheme } from '../../ui/theme.js'
import { Badge } from './Milestones.jsx'

// Home hero, two swipeable pages: 1 = the milestone ring + label + daily line,
// 2 = clean time (days and hours) with the last and next milestone cards.
export function HeroPager({ hero, days, since, segment, label, milestones, today, profile, now }) {
  const { c } = useTheme()
  const [page, setPage] = useState(0)
  const [width, setWidth] = useState(0)
  const track = useRef(null)
  const ct = { ...cleanTime(hero, now), days }
  const cards = milestoneCards(hero, milestones, today)
  const line = dailyLine(profile, today)

  function go(i) {
    setPage(i)
    track.current?.scrollTo?.({ x: i * width, animated: true })
  }
  const pageStyle = { width: width || undefined, alignItems: 'center', justifyContent: 'center', minHeight: sz.ring + 20 }

  return (
    <View style={{ gap: 10 }} testID="hero">
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView ref={track} horizontal pagingEnabled showsHorizontalScrollIndicator={false} testID="hero-pager"
          onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)); if (i !== page) setPage(i) }}>
          <View style={pageStyle} importantForAccessibility={page === 0 ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={page !== 0}>
            <Ring value={segment.progress} testID="hero-ring">
              <T font="bold" size={type.ringName} max={MAX_SCALE.ringSmall} color={c.accent} numberOfLines={1} accessibilityLabel={hero.name}
                style={{ letterSpacing: 2, textTransform: 'uppercase' }}>{hero.name}</T>
              <T font="serif" size={days > 99999 ? type.ringDaysSm : days > 999 ? type.ringDaysMd : type.ringDays} max={MAX_SCALE.ring} color={c.title} testID="hero-days"
                accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} clean`} style={{ lineHeight: type.ringDays + 4, fontVariant: ['lining-nums', 'tabular-nums'] }}>{days.toLocaleString()}</T>
              <T font="serif" size={type.ringLabel} max={MAX_SCALE.ringSmall} color={c.title}>{days === 1 ? 'day clean' : 'days clean'}</T>
              <T size={12} max={MAX_SCALE.ringSmall} color={c.muted}>{since}</T>
            </Ring>
          </View>
          <View style={pageStyle} testID="clean-time" importantForAccessibility={page === 1 ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={page !== 1}>
            <T font="bold" size={13} color={c.accent} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>{hero.name} · clean for</T>
            <View accessible accessibilityLabel={cleanTimeLabel(ct)} testID="clean-time-value" style={{ alignItems: 'center' }}>
              <T font="serif" size={46} max={MAX_SCALE.ring} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{ct.days.toLocaleString()} <T font="serif" size={24} max={MAX_SCALE.ring} color={c.title}>{ct.days === 1 ? 'day' : 'days'}</T></T>
              <T font="serif" size={type.screenTitle} max={MAX_SCALE.ring} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{ct.hours} <T font="serif" size={22} max={MAX_SCALE.ring} color={c.title}>{ct.hours === 1 ? 'hour' : 'hours'}</T></T>
            </View>
            <T size={14} color={c.muted}>since {sinceLabel(hero)}</T>
          </View>
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }} accessibilityRole="tablist">
        {['Milestone ring', 'Clean time'].map((name, i) => (
          <Pressable key={name} onPress={() => go(i)} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{ selected: page === i }}
            testID={`pager-dot-${i}`} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: page === i ? 18 : 8, height: 8, borderRadius: 4, backgroundColor: page === i ? c.title : c.fieldBorder }} />
          </Pressable>
        ))}
      </View>

      {page === 0 ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <T size={15} color={c.muted} testID="ring-label" style={{ textAlign: 'center' }}>
            <T font="bold" size={15} color={c.title}>{label.lead}</T>{label.rest}
          </T>
          {line.text ? (
            <View testID="daily-line" style={{ alignItems: 'center', gap: 4, paddingHorizontal: 12 }}>
              <T font="serifItalic" size={21} color={c.title} style={{ textAlign: 'center' }}>“{line.text.replace(/[.]?$/, '.')}”</T>
              <T size={13} color={c.muted}>{line.caption}</T>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }} testID="milestone-cards">
          <MsCard testID="ms-last" k="Last milestone" badge={cards.last?.short} earned
            name={cards.last ? cards.last.name : 'Not yet'}
            date={cards.last ? `${cards.last.dateLabel}${cards.last.earlier ? ' · earlier count' : ''}` : 'Your first is 7 days'} />
          <MsCard testID="ms-next" k="Next milestone" badge={cards.next.short} name={cards.next.name} date={cards.next.dateLabel} progress={cards.next.progress} />
        </View>
      )}
    </View>
  )
}

function MsCard({ k, badge, earned = false, name, date, progress, testID }) {
  const { c } = useTheme()
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T font="semibold" size={13} color={c.muted} style={{ flex: 1 }}>{k}</T>
        {badge ? <Badge label={badge} earned={earned} /> : null}
      </View>
      <T font="semibold" size={type.body} color={c.title}>{name}</T>
      <T size={13} color={c.muted}>{date}</T>
      {progress != null ? (
        <View accessibilityRole="progressbar" accessibilityLabel={`Progress to ${name}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={{ height: 6, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden', marginTop: 4 }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: c.ringA }} />
        </View>
      ) : null}
    </View>
  )
}
