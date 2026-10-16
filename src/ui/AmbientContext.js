import { createContext, useContext, useEffect, useState } from 'react'

// The one ambient sound controller (src/lib/ambient.js), shared by Home, sessions and settings.
export const AmbientContext = createContext(null)
export const useAmbient = () => useContext(AmbientContext)
export function useAmbientState() {
  const amb = useAmbient()
  const [s, setS] = useState(() => amb?.state ?? { status: 'idle', soundId: null })
  useEffect(() => amb?.subscribe(setS), [amb])
  return s
}
