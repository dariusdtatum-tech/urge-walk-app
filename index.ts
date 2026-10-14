import { registerRootComponent } from 'expo';

import App from './App';
import { installStorage } from './src/storage';

// SQLite-backed storage behind the PWA's localStorage interface, before anything reads data.
installStorage();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
