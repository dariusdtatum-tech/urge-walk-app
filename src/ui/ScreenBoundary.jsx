import { Component } from 'react'
import { View } from 'react-native'
import { PrimaryButton } from './kit.jsx'
import { T } from './Text.jsx'
import { space, type, useTheme } from './theme.js'

function Fallback({ onHome }) {
  const { c } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: space.screen, gap: space.section, backgroundColor: c.bg }} testID="screen-error">
      <T accessibilityRole="header" font="serif" size={type.sheetTitle} color={c.title}>Something went wrong on this screen.</T>
      <T size={type.body} color={c.text}>Your data is safe.</T>
      <PrimaryButton label="Go home" onPress={onHome} testID="screen-error-home" />
    </View>
  )
}

// Catches a crash in one screen so the rest of the app (and Ride it out) keeps working.
// Nothing is sent anywhere: there is no crash reporting.
export class ScreenBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* no logs, no reports */ }
  render() {
    if (this.state.failed) return <Fallback onHome={() => { this.setState({ failed: false }); this.props.onHome?.() }} />
    return this.props.children
  }
}
