// Gemini review 3 (Oct 16 2026). Neutral test data only.
import { StyleSheet } from 'react-native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { TAB_OVERHANG } from '../ui/layout.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice } from './helpers.js'

export const renderApp = async (extra = {}, scheme = 'light') => {
  const storage = memoryStorage({ ...onboardedProfile(), ...habitsSeed(), ...extra })
  const r = await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
  return { storage, ...r }
}
const press = async (id) => { await act(async () => { fireEvent.press(screen.getByTestId(id)) }) }
const tab = async (name) => { await act(async () => { fireEvent.press(screen.getByRole('tab', { name })) }) }

describe('layout: tab bar and top edge', () => {
  it('tab screens stop above the raised Ride it out button (Log dots, Appearance footer)', async () => {
    await renderApp()
    expect(StyleSheet.flatten(screen.getByTestId('screen-area').props.style).marginBottom).toBe(TAB_OVERHANG)
    await tab('Track')
    expect(StyleSheet.flatten(screen.getByTestId('screen-area').props.style).marginBottom).toBe(TAB_OVERHANG)
  })
  it('sessions have no tab bar, so no reserved strip', async () => {
    await renderApp()
    await press('ride-button'); await press('ride-breathe')
    expect(StyleSheet.flatten(screen.getByTestId('screen-area').props.style).marginBottom).toBe(0)
  })
  it('You sections keep a solid sticky header, so Data and privacy never clips at the top edge', async () => {
    await renderApp()
    await tab('You'); await press('you-data')
    expect(screen.getByTestId('you').props.stickyHeaderIndices).toEqual([0])
    expect(StyleSheet.flatten(screen.getByTestId('you-header').props.style).backgroundColor).toBeTruthy()
  })
})

describe('Reset app row', () => {
  it.each(['light', 'dark'])('is navy / cream, never red (%s)', async (scheme) => {
    const P = require('../ui/palette.js')
    await renderApp({}, scheme)
    await tab('You'); await press('you-data')
    const title = screen.getByText('Reset app')
    const color = StyleSheet.flatten(title.props.style).color
    expect(color).toBe(P[scheme].title)
    expect(['#b23a2e', '#f2a297']).not.toContain(color)
  })
})

describe('Progress: one source for time back', () => {
  it('the hours stat, the Time back card and the since date all agree, and the date is in the past', async () => {
    await renderApp(onboardedProfile({ before: { daysPerWeek: 5, timesPerDay: 2 } }))
    await tab('You'); await press('you-progress')
    const card = screen.getByTestId('tb-hours').props.children
    expect(screen.getByTestId('pair-hours')).toHaveTextContent(new RegExp(`^${card}`))
    const formula = [].concat(screen.getByTestId('tb-formula').props.children).join('')
    const since = formula.match(/^Since (.+?), based on/)[1]
    expect(screen.getByText(new RegExp(`since ${since}$`))).toBeTruthy()
    expect(since).not.toMatch(/20[3-9]\d/) // never a future year
  })
  it('a start date in the future gives no estimate rather than a wrong one', () => {
    const { timeBack } = require('../lib/homeIdeas.js')
    const profile = { before: { daysPerWeek: 7, timesPerDay: 2 } }
    expect(timeBack(profile, { startDate: '2030-01-10' }, '2030-01-01')).toBeNull()
    expect(timeBack(profile, { startDate: '2029-12-01' }, '2030-01-01').hours).toBeGreaterThan(0)
  })
})
