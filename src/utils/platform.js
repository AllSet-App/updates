/**
 * Platform detection and utility functions
 */

export const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
}

export const isCapacitor = () => {
    return typeof window !== 'undefined' && window.Capacitor !== undefined
}

/**
 * Opens a URL in an external browser or system application
 * 
 * - Electron: Uses IPC to open in system default browser
 * - Capacitor: Uses Browser plugin to open in system browser/overlay
 * - Web: Opens in a new tab
 * 
 * @param {string} url - The URL to open
 */
export const openExternalUrl = async (url) => {
    if (!url) return

    if (isElectron()) {
        if (window.electronAPI?.openExternal) {
            try {
                await window.electronAPI.openExternal(url)
                return
            } catch (e) {
                console.error('Electron openExternal error:', e)
            }
        }
    } else if (isCapacitor()) {
        try {
            const { Browser } = await import('@capacitor/browser')
            await Browser.open({ url })
            return
        } catch (e) {
            console.error('Capacitor Browser error:', e)
        }
    }

    // Fallback for Web or if platform-specific methods fail
    if (url.startsWith('mailto:')) {
        window.location.href = url
    } else {
        window.open(url, '_blank', 'noopener,noreferrer')
    }
}
