export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Apple-standard dark theme
                background: {
                    DEFAULT: '#000000',
                    secondary: '#1c1c1e',
                    tertiary: '#2c2c2e',
                    elevated: '#2c2c2e',
                },
                surface: {
                    DEFAULT: 'rgba(28, 28, 30, 0.8)',
                    hover: 'rgba(44, 44, 46, 0.8)',
                    active: 'rgba(58, 58, 60, 0.8)',
                },
                // Apple System Blue
                accent: {
                    DEFAULT: '#007AFF',
                    hover: '#0A84FF',
                    muted: 'rgba(0, 122, 255, 0.15)',
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#8e8e93',
                    muted: '#48484a',
                },
                border: {
                    DEFAULT: 'rgba(255, 255, 255, 0.1)',
                    hover: 'rgba(255, 255, 255, 0.2)',
                },
                // Apple semantic colors
                success: '#34C759',
                warning: '#FF9F0A',
                error: '#FF453A',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '1.75rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'scale-in': 'scaleIn 0.2s ease-out',
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
                    from: { backgroundPosition: '0 0' },
                    to: { backgroundPosition: '-200% 0' },
                },
            },
            boxShadow: {
                'glow': '0 0 20px rgba(0, 122, 255, 0.3)',
                'glow-lg': '0 0 40px rgba(0, 122, 255, 0.4)',
            },
        },
    },
    plugins: [],
};
