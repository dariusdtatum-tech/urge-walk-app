import { useState } from 'react'
import { View } from 'react-native'
import { DEFAULT_REMINDER, loadReminder, saveReminder } from '../lib/checkin.js'
import { clearPendingFollowUp, loadFollowUpEnabled, saveFollowUpEnabled } from '../lib/followUp.js'
import { loadNotifyPrefs, saveNotifyPrefs, weekPreview } from '../lib/notifyBudget.js'
import { useDevice } from '../ui/DeviceContext.js'
import { Card, Sheet, Tag, ToggleRow } from '../ui/kit.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { space, type, useTheme } from '../ui/theme.js'

const TITLES = { checkin: 'Daily check-in reminder', followUp: 'Check in after an urge', walkAlert: 'Walk timer' }

// One calm notification budget, with a preview of exactly what this week's notifications say.
export function NotificationsSheet({ onClose }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const [reminder, setReminder] = useState(() => loadReminder(storage))
  const [followUpOn, setFollowUpOn] = useState(() => loadFollowUpEnabled(storage))
  const [walkAlertOn, setWalkAlertOn] = useState(() => loadNotifyPrefs(storage).walkAlert)
  const set = {
    checkin: (on) => { const r = on ? DEFAULT_REMINDER : null; saveReminder(r, storage); setReminder(r); device.syncCheckinReminder(r) },
    followUp: (on) => { saveFollowUpEnabled(on, storage); setFollowUpOn(on); if (!on) { clearPendingFollowUp(storage); device.cancelFollowUp() } },
    walkAlert: (on) => { saveNotifyPrefs({ walkAlert: on }, storage); setWalkAlertOn(on) },
  }
  return (
    <Sheet title="Notifications" onClose={onClose} testID="notify-sheet">
      <T size={type.body} color={c.text} testID="notify-budget">
        At most one a day from Urge Walk, and none from 10 PM to 8 AM. Reminders you set yourself don’t count.
      </T>
      <T font="semibold" size={type.sub} color={c.muted}>This week’s notifications</T>
      {weekPreview({ reminder, followUpOn, walkAlertOn }).map((n) => (
        <View key={n.id} style={{ gap: space.cardGap }} testID={`notify-${n.id}`}>
          <ToggleRow title={TITLES[n.id]} sub={n.when} value={n.on} onChange={set[n.id]} testID={`notify-${n.id}-toggle`} />
          {n.on ? (
            <Card testID={`notify-${n.id}-preview`}>
              <T font="semibold" size={type.rowTitle} color={c.title}>{n.title}</T>
              <T size={type.rowSub} color={c.textSoft}>{n.body}</T>
              {n.counts ? <Tag label="Counts toward the one a day" /> : <Tag label="Yours, doesn’t count" />}
            </Card>
          ) : null}
        </View>
      ))}
    </Sheet>
  )
}
