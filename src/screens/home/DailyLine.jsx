// Home's daily line (spec: handoff/daily-line-design.md). Plain text below the hero, no card.
// Poems keep their line breaks with a small indent; quotes and verses flow as one paragraph.
// Long-press opens the system copy menu. Renders nothing when the source is Off.
import { View } from 'react-native'
import { lineFor, lineLabel, lineText } from '../../lib/dailyLine.js'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

export function DailyLine({ date, source }) {
  const { c } = useTheme()
  const line = lineFor(date, source)
  if (!line) return null
  return (
    <View testID="daily-line" accessible accessibilityLabel={lineLabel(line)} style={{ paddingTop: 8 }}>
      <T font="serifItalic" size={19} color={c.verseText} selectable testID="daily-line-text"
        style={{ lineHeight: 26, paddingLeft: line.kind === 'poem' ? 12 : 0 }}>{lineText(line)}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <View style={{ width: 16, height: 1, backgroundColor: c.verseRef }} />
        <T size={12} color={c.verseRef} style={{ letterSpacing: 0.2 }} testID="daily-line-by">{line.kind === 'verse' ? `${line.by} ${line.tr}` : line.by}</T>
      </View>
    </View>
  )
}
