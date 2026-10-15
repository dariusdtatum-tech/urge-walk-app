import { fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { ENTITLEMENTS, FREE_FOREVER, canUse } from '../lib/entitlements.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0, youEl } from './helpers.js'

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers() })
const renderApp = () => render(<AppRoot storage={memoryStorage({ ...habitsSeed(), ...onboardedProfile() })} device={stubDevice()} clock={fakeClock()} />)

describe('Free forever', () => {
  it('no free feature is gated in the entitlement map, even with no purchases at all', () => {
    for (const f of FREE_FOREVER.features) {
      expect(ENTITLEMENTS[f.id].free).toBe(true)
      expect(ENTITLEMENTS[f.id].entitlement).toBeNull()
      expect(canUse(f.id, [])).toBe(true)
    }
  })
  it('You lists every free feature with the promise, and no Plus tag', async () => {
    await renderApp()
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    await fireEvent.press((await youEl(screen, fireEvent, 'free-row')))
    expect(screen.getByTestId('free-promise')).toHaveTextContent(FREE_FOREVER.promise)
    for (const f of FREE_FOREVER.features) expect(screen.getByTestId(`free-${f.id}`)).toHaveTextContent(new RegExp(f.label.replace(/[()?]/g, '.')))
    expect(screen.queryByText('Plus')).toBeNull()
  })
  it('every Ride it out tool opens straight away, with no gate', async () => {
    await renderApp()
    for (const [tile, screenId] of [['ride-breathe', 'breathe'], ['ride-ground', 'ground'], ['ride-walk', 'walk-screen']]) {
      await fireEvent.press(screen.getByTestId('ride-button'))
      await fireEvent.press(screen.getByTestId(tile))
      expect(screen.queryByText(/premium|upgrade|subscribe/i)).toBeNull()
      if (screenId !== 'walk-screen') { expect(screen.getByTestId(screenId)).toBeTruthy(); await fireEvent.press(screen.getByTestId(`${screenId}-cancel`)) }
      else { expect(screen.queryByTestId('ride-sheet')).toBeNull(); return }
    }
  })
})
