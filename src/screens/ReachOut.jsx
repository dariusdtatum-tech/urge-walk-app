// Reach out: your trusted people (Text opens Messages filled in, Call opens the dialer) and the
// 988 row, which is always there. The app never sends anything itself and keeps no record of who was contacted.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { CRISIS_LINE, MAX_CONTACTS, MAX_MESSAGE, MESSAGE_PRESETS, addContact, loadContactsData, removeContact, setMessage, telHref } from '../lib/contacts.js'
import { MAX_TRUSTED_NAME } from '../lib/profile.js'
import { Button } from '../ui/Button.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { Field } from '../ui/Field.jsx'
import { Card } from '../ui/Row.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'
import { Check } from './onboarding/Steps.jsx'

function SmallButton({ label, onPress, testID, accessibilityLabel, primary = false }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? c.action : 'transparent', borderWidth: primary ? 0 : 1.5, borderColor: c.title }}>
      <T font="semibold" size={15} color={primary ? c.onAction : c.title}>{label}</T>
    </Pressable>
  )
}

// The list itself. `onSetup` shows an "Add someone you trust" link when nobody is set up yet.
export function ReachOut({ testID = 'reach', onSetup = null, title = 'Reach out' }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const [{ contacts, message }] = useState(() => loadContactsData(storage))
  return (
    <View style={{ gap: 8 }} testID={testID}>
      {title ? <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{title}</T> : null}
      {contacts.map((p, i) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} testID={`${testID}-person-${i}`}>
          <T font="semibold" size={16} color={c.title} style={{ flex: 1 }} numberOfLines={1}>{p.name}</T>
          <SmallButton primary label="Text" accessibilityLabel={`Text ${p.name}. Opens Messages with your note filled in.`} onPress={() => device.textContact(p.phone, message)} testID={`${testID}-text-${i}`} />
          <SmallButton label="Call" accessibilityLabel={`Call ${p.name}`} onPress={() => device.openURL(telHref(p.phone))} testID={`${testID}-call-${i}`} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} testID={`${testID}-988`}>
        <View style={{ flex: 1 }}>
          <T font="semibold" size={16} color={c.title}>988 Lifeline</T>
          <T size={13} color={c.muted}>{CRISIS_LINE.note}</T>
        </View>
        <SmallButton label="Text" accessibilityLabel="Text 988" onPress={() => device.openURL('sms:988')} testID={`${testID}-988-text`} />
        <SmallButton label="Call" accessibilityLabel="Call 988" onPress={() => device.openURL('tel:988')} testID={`${testID}-988-call`} />
      </View>
      {contacts.length === 0 && onSetup ? (
        <Pressable onPress={onSetup} accessibilityRole="button" testID={`${testID}-setup`} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T font="semibold" size={15} color={c.accent} style={{ textDecorationLine: 'underline' }}>Add someone you trust</T>
        </Pressable>
      ) : null}
    </View>
  )
}

// You → Trusted contacts: up to 3 people and the message written ahead of time.
export function ContactsSheet({ onClose }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const [data, setData] = useState(() => loadContactsData(storage))
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [custom, setCustom] = useState(!MESSAGE_PRESETS.includes(data.message))
  const refresh = () => setData(loadContactsData(storage))
  const full = data.contacts.length >= MAX_CONTACTS

  function add() {
    const r = addContact(storage, { name, phone })
    if (!r.ok) { setError(r.error); return }
    setName(''); setPhone(''); setError(''); setAdding(false); refresh()
  }
  async function pick() {
    const got = await device.pickContact()
    if (!got) return
    setName(got.name.slice(0, MAX_TRUSTED_NAME)); setPhone(got.phone); setAdding(true); setError('')
  }
  const changeMessage = (m) => { setMessage(storage, m); refresh() }

  return (
    <Sheet title="Trusted contacts" onClose={onClose} testID="contacts-sheet" right={<HeaderButton label="Done" onPress={onClose} />}>
      <T size={15} color={c.text}>Up to {MAX_CONTACTS} people you can reach in one tap. Text opens Messages with your note filled in. You press Send. Nothing is sent by the app.</T>
      {data.contacts.map((p, i) => (
        <Card key={p.id} testID={`contact-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T font="semibold" size={16} color={c.title}>{p.name}</T>
            <T size={14} color={c.textSoft}>{p.phone}</T>
          </View>
          <SmallButton label="Remove" accessibilityLabel={`Remove ${p.name}`} onPress={() => { removeContact(storage, p.id); refresh() }} testID={`contact-remove-${i}`} />
        </Card>
      ))}
      {!full && !adding ? (
        <View style={{ gap: 8 }}>
          <Button label="Choose from Contacts" onPress={pick} testID="contact-pick" />
          <Button kind="secondary" label="Type a name and number" onPress={() => setAdding(true)} testID="contact-add" />
        </View>
      ) : null}
      {full ? <T size={14} color={c.muted}>That’s {MAX_CONTACTS}, the most you can add.</T> : null}
      {adding ? (
        <Card testID="contact-form">
          <Field label="Name" value={name} onChangeText={setName} maxLength={MAX_TRUSTED_NAME} placeholder="e.g. Sam" testID="contact-name" />
          <Field label="Phone number" value={phone} onChangeText={setPhone} maxLength={30} keyboardType="phone-pad" placeholder="(555) 123-4567" testID="contact-phone" invalid={!!error} />
          {error ? <T size={14} color={c.error} accessibilityRole="alert" testID="contact-error">{error}</T> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button kind="secondary" label="Cancel" onPress={() => { setAdding(false); setError('') }} style={{ flex: 1 }} />
            <Button label="Add" onPress={add} style={{ flex: 1 }} testID="contact-save" />
          </View>
        </Card>
      ) : null}

      <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>Your message</T>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {MESSAGE_PRESETS.map((m, i) => {
          const on = !custom && data.message === m
          return (
            <Pressable key={m} onPress={() => { setCustom(false); changeMessage(m) }} accessibilityRole="radio" accessibilityState={{ checked: on }} testID={`message-${i}`}
              style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.title : c.border, backgroundColor: c.card }}>
              <T size={15} color={c.text} style={{ flex: 1 }}>{m}</T>
              {on ? <Check color={c.title} /> : null}
            </Pressable>
          )
        })}
        <Pressable onPress={() => setCustom(true)} accessibilityRole="radio" accessibilityState={{ checked: custom }} testID="message-custom"
          style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 14, borderWidth: custom ? 2 : 1, borderColor: custom ? c.title : c.border, backgroundColor: c.card }}>
          <T size={15} color={c.text}>Write my own</T>
        </Pressable>
        {custom ? <Field label="Your message" value={data.message} onChangeText={changeMessage} maxLength={MAX_MESSAGE} multiline testID="message-own" /> : null}
      </View>
    </Sheet>
  )
}
