'use client'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

// Applied before paint by an inline script in the layout to avoid a flash, so
// here we only mirror the already-set class into React state and keep it synced.
function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => { setTheme(currentTheme()) }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('light', next === 'light')
    try { localStorage.setItem('draftxi-theme', next) } catch {}
    setTheme(next)
  }

  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="fixed bottom-[4.25rem] right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-base shadow-lg backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/12"
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
