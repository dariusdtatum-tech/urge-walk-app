import { useState } from 'react'
import { sheetBottomSpace } from '../ui/layout.js'
import { Modal, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, Chart, EmptyState, PrimaryButton, QuietLink, Row, Tag, ToggleRow } from '../ui/kit.jsx'
import { PreviewReducedMotion, useReducedMotion } from '../ui/motion.js'
import { HeaderButton } from '../ui/Sheet.jsx'
import { PreviewFontScale, T } from '../ui/Text.jsx'
import { SchemeContext, space, type, useTheme } from '../ui/theme.js'

const LARGEST = 3.1 // iOS AX5 is about 310% of the default size; T still applies each text's own cap
const THEMES = [['light', 'Light'], ['dark', 'Night']]
const WEEK = [['M', 1], ['T', 0], ['W', 2], ['T', 3], ['F', 1], ['S', 0], ['S', 2]].map(([label, value], i) => ({ key: String(i), label, value }))

function Gallery({ name }) {
  const { c } = useTheme()
  const still = useReducedMotion()
  return (
    <View style={{ backgroundColor: c.bg, padding: space.screen, gap: space.section }} testID={`design-${name}`}>
      <T accessibilityRole="header" font="serif" size={type.sheetTitle} color={c.title}>{name}</T>
      <T size={type.footnote} color={c.muted}>Reduce Motion: {still ? 'on' : 'off'}</T>
      <Card>
        <T font="semibold" size={type.rowTitle} color={c.title}>Card</T>
        <T size={type.body} color={c.text}>Body text on a card.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}><Tag label="Tag" /><Tag label="Plus" tone="plus" /></View>
      </Card>
      <Row title="Row" sub="A sub-line" onPress={() => {}} />
      <ToggleRow title="Toggle row" sub="A sub-line" value onChange={() => {}} />
      <PrimaryButton label="Primary button" onPress={() => {}} />
      <QuietLink label="Quiet link" onPress={() => {}} />
      <Card><EmptyState title="Nothing here yet" body="One calm sentence about what goes here." actionLabel="Add one" onAction={() => {}} /></Card>
      <Card><Chart data={WEEK} summary="A sample week: 9 in all" /></Card>
    </View>
  )
}

// Dev only (opened by a long-press on the version in You): every kit piece in Light and Night,
// at the largest text size and with Reduce Motion forced on. First Light isn't built yet.
export function DesignCheck({ onClose }) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const [big, setBig] = useState(false)
  const [still, setStill] = useState(false)
  return (
    <Modal visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} testID="design-check">
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} style={{ flex: 1 }}>Design Check</T>
          <HeaderButton label="Done" onPress={onClose} testID="design-done" />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: sheetBottomSpace(insets.bottom), gap: space.section }}>
          <View style={{ paddingHorizontal: space.screen, gap: space.cardGap }}>
            <T size={type.footnote} color={c.muted}>Developer builds only. First Light isn’t built yet.</T>
            <ToggleRow title="Largest text" value={big} onChange={setBig} testID="design-big" />
            <ToggleRow title="Reduce Motion" value={still} onChange={setStill} testID="design-still" />
          </View>
          <PreviewFontScale.Provider value={big ? LARGEST : null}>
            <PreviewReducedMotion.Provider value={still ? true : null}>
              {THEMES.map(([s, name]) => (
                <SchemeContext.Provider key={s} value={s}><Gallery name={name} /></SchemeContext.Provider>
              ))}
            </PreviewReducedMotion.Provider>
          </PreviewFontScale.Provider>
        </ScrollView>
      </View>
    </Modal>
  )
}
