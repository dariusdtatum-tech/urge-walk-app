// Web preview build (react-native-web, used for screenshots): the browser's own localStorage,
// which already has the interface the shared logic expects. Phones use SQLite (index.js).
export const DB_NAME = 'urgewalk.db'
export function getStorage() { return globalThis.localStorage }
export function installStorage() { return globalThis.localStorage }
