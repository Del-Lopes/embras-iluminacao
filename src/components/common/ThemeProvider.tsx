'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

type ThemeContextValue = {
	theme: Theme
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useTheme = () => {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>('dark')

	useEffect(() => {
		const stored = localStorage.getItem('theme') as Theme | null
		if (stored === 'light') {
			setTheme('light')
			document.documentElement.classList.add('light')
		}
	}, [])

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next = prev === 'dark' ? 'light' : 'dark'
			localStorage.setItem('theme', next)
			if (next === 'light') {
				document.documentElement.classList.add('light')
			} else {
				document.documentElement.classList.remove('light')
			}
			return next
		})
	}, [])

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}
