export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dark theme palette
                background: {
                    DEFAULT: '#0a0a0f',
                    secondary: '#12121a',
                    tertiary: '#1a1a24',
                },
                surface: {
                    DEFAULT: 'rgba(255, 255, 255, 0.03)',
                    hover: 'rgba(255, 255, 255, 0.06)',
                    active: 'rgba(255, 255, 255, 0.08)',
                },
                accent: {
                    DEFAULT: '#6366f1',
                    hover: '#818cf8',
                    muted: 'rgba(99, 102, 241, 0.15)',
                },
                text: {
                    primary: '#fafafa',
                    secondary: '#a1a1aa',
                    muted: '#52525b',
                },
                border: {
                    DEFAULT: 'rgba(255, 255, 255, 0.08)',
                    hover: 'rgba(255, 255, 255, 0.12)',
                },
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'scale-in': 'scaleIn 0.2s ease-out',
                pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                shimmer: 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            boxShadow: {
                glow: '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-lg': '0 0 40px rgba(99, 102, 241, 0.4)',
            },
        },
    },
    plugins: [],
};
