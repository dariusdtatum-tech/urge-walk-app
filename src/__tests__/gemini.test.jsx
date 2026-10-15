import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { sheetMaxHeight } from '../screens/RideSheet.jsx'
import { avgChip } from '../screens/home/WalksCard.jsx'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

const renderApp = async (extra = {}, scheme = 'light') => {
  const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), ...extra })
  await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
  return storage
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

describe('Ride it out sheet', () => {
  test('caps its height from the window (not a % of its own wrapper) so the footer tip is reachable', async () => {
    await renderApp()
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    const st = StyleSheet.flatten(screen.getByTestId('ride-sheet').props.style)
    expect(typeof st.maxHeight).toBe('number')
    expect(screen.getByTestId('ride-tip')).toBeTruthy()
  })
  test('sheetMaxHeight leaves room for the top inset', () => {
    expect(sheetMaxHeight(844, 47)).toBe(844 - 47 - 16)
    expect(sheetMaxHeight(844, 0)).toBe(844 - 24 - 16)
  })
})

describe('Your walks', () => {
  test('avgChip: minutes, singular, and an empty dash', async () => {
    expect(avgChip(450)).toMatchObject({ n: 8, label: 'Avg walk', sub: 'minutes', a11y: 'Average walk 8 minutes' })
    expect(avgChip(20)).toMatchObject({ n: 1, sub: 'minute' })
    expect(avgChip(null)).toMatchObject({ n: '–', label: 'Avg walk' })
  })
})
