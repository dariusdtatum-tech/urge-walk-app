// Community, before launch: "Coming soon", the 18+ house rules preview, a "tell me when it opens"
// switch kept on this phone (no network, no account), and today's line. No feed.
import { useState } from 'react'
import { ScrollView, Switch, View } from 'react-native'
import { todayISO } from '../lib/cleanTime.js'
import { COMMUNITY_RULES, loadCommunityNotify, saveCommunityNotify } from '../lib/community.js'
import { dailyLine } from '../lib/homeIdeas.js'
import { loadProfile } from '../lib/profile.js'
import { Card } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { space, type, useTheme } from '../ui/theme.js'
import { Check } from './onboarding/Steps.jsx'

export function CommunityScreen({ now, clock = Date.now }) {
  const storage = useStorage()
  const { c } = useTheme()
  const [notify, setNotify] = useState(() => loadCommunityNotify(storage))
  const [line] = useState(() => dailyLine(loadProfile(storage), todayISO(new Date(now))))
  const toggle = (on) => { saveCommunityNotify(on, storage, clock()); setNotify(on) }
  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: space.section }} testID="community">
      <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Community</T>
      <Card testID="community-soon">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T accessibilityRole="header" font="serif" size={26} color={c.title} style={{ flex: 1 }}>Coming soon</T>
          <View testID="community-18" style={{ backgroundColor: c.action, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <T font="bold" size={13} color={c.onAction}>18+ only</T>
          </View>
        </View>
        <T size={type.body} color={c.text}>A quiet space for adults riding out urges. No feed, no likes, no pressure to post. Clean, safe and sobriety-focused.</T>
        <T font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>House rules</T>
        <View style={{ gap: 8 }} testID="community-rules">
          {COMMUNITY_RULES.map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ paddingTop: 4 }}><Check color={c.title} /></View>
              <T size={15} color={c.text} style={{ flex: 1 }}>{r}</T>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T font="semibold" size={type.body} color={c.title} nativeID="notify-label">Tell me when it opens</T>
            <T size={14} color={c.muted}>Saved on this phone only. We’ll tell you once, here in the app.</T>
          </View>
          <Switch value={notify} onValueChange={toggle} testID="community-notify" accessibilityLabel="Tell me when it opens"
            trackColor={{ true: c.action, false: c.track }} thumbColor={c.card} ios_backgroundColor={c.track} />
        </View>
      </Card>
      <Card testID="community-line">
        <T font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>Today’s line</T>
        <T font="serifItalic" size={22} color={c.title} style={{ textAlign: 'center' }}>“{line.text}”</T>
      </Card>
    </ScrollView>
  )
}
