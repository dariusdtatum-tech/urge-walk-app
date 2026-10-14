import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { AppRoot } from './src/AppRoot.jsx';
import { device } from './src/native/device.js';
import { getStorage } from './src/storage';
import { FONT_FILES } from './src/ui/theme.js';

// Bundled OFL fonts load first (they ship inside the app; no network).
export default function App() {
  const [loaded] = useFonts(FONT_FILES);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#faf7f1' }} />;
  return <AppRoot storage={getStorage()} device={device} />;
}
