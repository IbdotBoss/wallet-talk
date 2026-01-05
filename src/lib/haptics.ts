/**
 * Haptic Feedback Service
 * 
 * Provides Apple-like haptic feedback using the Vibration API.
 * Falls back gracefully on unsupported devices.
 */

export type HapticIntensity = 'light' | 'medium' | 'heavy';

// Vibration patterns (in milliseconds)
const PATTERNS: Record<HapticIntensity, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: [30, 10, 30],
};

/**
 * Checks if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
    return 'vibrate' in navigator;
}

/**
 * Triggers haptic feedback
 */
export function triggerHaptic(intensity: HapticIntensity = 'light'): void {
    if (!isHapticSupported()) {
        return;
    }

    try {
        const pattern = PATTERNS[intensity];
        navigator.vibrate(pattern);
    } catch {
        // Silently fail - haptics are non-critical
    }
}

/**
 * Triggers a success haptic pattern
 */
export function hapticSuccess(): void {
    if (!isHapticSupported()) return;
    try {
        navigator.vibrate([10, 50, 20]);
    } catch {
        // Silently fail
    }
}

/**
 * Triggers an error haptic pattern
 */
export function hapticError(): void {
    if (!isHapticSupported()) return;
    try {
        navigator.vibrate([50, 30, 50, 30, 50]);
    } catch {
        // Silently fail
    }
}

/**
 * Triggers a notification haptic
 */
export function hapticNotification(): void {
    triggerHaptic('medium');
}
