'use client'

import { useTheme } from '@/components/common/ThemeProvider'

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === 'dark'

	return (
		<button
			onClick={toggleTheme}
			className="relative w-10 h-5 rounded-full border border-white/20 transition-colors duration-300 cursor-pointer flex items-center"
			style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
			aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
		>
			<span
				className="absolute w-3 h-3 rounded-full transition-all duration-300"
				style={{
					backgroundColor: isDark ? '#ffffff' : '#0a0a0a',
					left: isDark ? '3px' : '21px',
				}}
			/>
		</button>
	)
}
