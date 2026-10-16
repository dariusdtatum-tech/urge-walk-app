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
