import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { AppRoot } from './src/AppRoot.jsx';
import { device } from './src/native/device.js';
import { getStorage } from './src/storage';
import { FONT_FILES } from './src/ui/theme.js';
import { PreviewFontScale } from './src/ui/Text.jsx';

// Dev web builds only: `?fontScale=3.1` previews the largest text on real screens (screenshots, reviews).
const devFontScale = __DEV__ && typeof window !== 'undefined' && window.location?.search
  ? Number(new URLSearchParams(window.location.search).get('fontScale')) || null
  : null;
const Scale: any = PreviewFontScale;

// Bundled OFL fonts load first (they ship inside the app; no network).
export default function App() {
  const [loaded] = useFonts(FONT_FILES);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#faf7f1' }} />;
  const app = <AppRoot storage={getStorage()} device={device} />;
  return devFontScale ? <Scale.Provider value={devFontScale}>{app}</Scale.Provider> : app;
}
