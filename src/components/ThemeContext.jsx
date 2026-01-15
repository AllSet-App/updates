import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const THEME_STORAGE_KEY = 'allset_theme'
const FONT_STORAGE_KEY = 'allset_font_family'
const SIZE_STORAGE_KEY = 'allset_font_size'
const PALETTE_STORAGE_KEY = 'allset_palette_id'

export const PALETTES = {
  signature: { id: 'signature', name: 'AllSet Signature', color: '#FF2E36', hover: '#e0282f' },
  midnight: { id: 'midnight', name: 'Midnight Blue', color: '#3B82F6', hover: '#2563EB' },
  emerald: { id: 'emerald', name: 'Emerald Garden', color: '#10B981', hover: '#059669' },
  sunburst: { id: 'sunburst', name: 'Sunburst Gold', color: '#F59E0B', hover: '#D97706' },
  royal: { id: 'royal', name: 'Royal Violet', color: '#8B5CF6', hover: '#7C3AED' }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e)
    }
    return 'system'
  })

  const [fontFamily, setFontFamilyState] = useState(() => {
    try {
      const stored = localStorage.getItem(FONT_STORAGE_KEY)
      if (stored && ['modern', 'professional', 'elegant', 'system'].includes(stored)) {
        return stored
      }
    } catch (e) {
      console.warn('Failed to read font from localStorage:', e)
    }
    return 'modern'
  })

  const [fontSize, setFontSizeState] = useState(() => {
    try {
      const stored = localStorage.getItem(SIZE_STORAGE_KEY)
      if (stored && ['small', 'normal', 'large'].includes(stored)) {
        return stored
      }
    } catch (e) {
      console.warn('Failed to read font size from localStorage:', e)
    }
    return 'normal'
  })

  const [paletteId, setPaletteIdState] = useState(() => {
    try {
      const stored = localStorage.getItem(PALETTE_STORAGE_KEY)
      if (stored && PALETTES[stored]) {
        return stored
      }
    } catch (e) {
      console.warn('Failed to read palette from localStorage:', e)
    }
    return 'signature'
  })

  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  // Persist values to localStorage
  useEffect(() => { localStorage.setItem(THEME_STORAGE_KEY, theme) }, [theme])
  useEffect(() => { localStorage.setItem(FONT_STORAGE_KEY, fontFamily) }, [fontFamily])
  useEffect(() => { localStorage.setItem(SIZE_STORAGE_KEY, fontSize) }, [fontSize])
  useEffect(() => { localStorage.setItem(PALETTE_STORAGE_KEY, paletteId) }, [paletteId])

  // Apply basic attributes to document
  useEffect(() => {
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    document.documentElement.setAttribute('data-font', fontFamily)
    document.documentElement.setAttribute('data-size', fontSize)
  }, [theme, systemTheme, fontFamily, fontSize])

  // Apply palette colors
  useEffect(() => {
    const palette = PALETTES[paletteId] || PALETTES.signature
    document.documentElement.style.setProperty('--accent-primary', palette.color)
    document.documentElement.style.setProperty('--accent-hover', palette.hover)

    // Also update dynamic variations for backgrounds if needed
    // Example: rgba version of accent
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 46, 54'
    }
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(palette.color))
  }, [paletteId])

  const setTheme = (newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setThemeState(newTheme)
    }
  }

  const setFontFamily = (newFont) => {
    if (['modern', 'professional', 'elegant', 'system'].includes(newFont)) {
      setFontFamilyState(newFont)
    }
  }

  const setFontSize = (newSize) => {
    if (['small', 'normal', 'large'].includes(newSize)) {
      setFontSizeState(newSize)
    }
  }

  const setPalette = (id) => {
    if (PALETTES[id]) {
      setPaletteIdState(id)
    }
  }

  const effectiveTheme = theme === 'system' ? systemTheme : theme

  const value = {
    theme,
    effectiveTheme,
    setTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    paletteId,
    setPalette,
    isDark: effectiveTheme === 'dark'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
