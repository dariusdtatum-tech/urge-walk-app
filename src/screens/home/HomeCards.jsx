// Slim Home (Gemini review 2): ONE flat sand panel holding Your why and the Daily check-in row, split by a
// hairline (HomePanel). This week, Urge Map and Money kept live in Track and You, not on Home.
import { View } from 'react-native'
import { FeaturedPanel } from '../../ui/kit.jsx'
import { CheckInCard } from '../CheckInSheet.jsx'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'
import { HomeReason } from '../Reasons.jsx'

export const HOME_PANEL = ['why-card', 'checkin-card']

// The one Home panel. No reason (or reasons locked): just the check-in.
export function HomePanel({ reason, onOpenWhy, today, onCheckIn }) {
  const { c } = useTheme()
  return (
    <FeaturedPanel testID="home-panel" style={{ gap: 0, paddingVertical: 8 }}>
      {reason ? (
        <View testID="why-card" style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.hairline }}>
          <T size={13} color={c.textSoft}>Your why</T>
          <HomeReason reason={reason} onOpen={onOpenWhy} align="left" />
        </View>
      ) : null}
      <CheckInCard today={today} onOpen={onCheckIn} flat />
    </FeaturedPanel>
  )
}
