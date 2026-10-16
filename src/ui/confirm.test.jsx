import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Confirm, confirmTiming } from './Confirm.jsx'

// The native path: a press hides the card (visible=false) first and runs the action only once the
// Modal has dismissed (onDismiss on iOS) or the fallback timer fires. Never unmount while visible.
describe('Confirm closes before acting (iOS Modal safety)', () => {
  beforeEach(() => { confirmTiming.fallbackMs = 400; jest.useFakeTimers() })
  afterEach(() => { confirmTiming.fallbackMs = 0; jest.useRealTimers() })
  const setup = async () => {
    const calls = []
    await render(<Confirm title="T" message="M" confirmLabel="OK" cancelLabel="Keep" onConfirm={() => calls.push('ok')} onCancel={() => calls.push('cancel')} />)
    return { calls }
  }
  test('Keep: the card hides first and the action runs only after the dismiss window, once', async () => {
    const { calls } = await setup()
    await fireEvent.press(screen.getByTestId('confirm-cancel'))
    expect(screen.queryByTestId('confirm')).toBeNull() // visible=false, still mounted
    expect(calls).toEqual([])
    await act(async () => { jest.advanceTimersByTime(399) })
    expect(calls).toEqual([])
    await act(async () => { jest.advanceTimersByTime(1) })
    expect(calls).toEqual(['cancel'])
    await act(async () => { jest.advanceTimersByTime(2000) })
    expect(calls).toEqual(['cancel'])
  })
  test('OK runs after the dismiss window', async () => {
    const { calls } = await setup()
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(calls).toEqual([])
    await act(async () => { jest.advanceTimersByTime(400) })
    expect(calls).toEqual(['ok'])
  })
})
