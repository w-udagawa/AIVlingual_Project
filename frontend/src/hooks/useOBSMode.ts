import { useEffect, useState } from 'react'

export const useOBSMode = () => {
  const [isOBSMode, setIsOBSMode] = useState(false)

  useEffect(() => {
    // Check if we're in OBS mode based on URL parameter
    const params = new URLSearchParams(window.location.search)
    const obsMode = params.get('obs') === 'true' || window.location.pathname === '/obs-mode'
    
    setIsOBSMode(obsMode)

    // Also check if we're running inside OBS browser source
    if (window.obsstudio) {
      setIsOBSMode(true)
    }
  }, [])

  return isOBSMode
}