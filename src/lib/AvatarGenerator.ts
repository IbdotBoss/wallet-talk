/**
 * Avatar Generator - Liquid Glass Style
 * 
 * Generates deterministic, vibrant gradient avatars from wallet addresses.
 * Each wallet gets a unique, consistent avatar based on address hash.
 */

// Vibrant color palettes for Liquid Glass effect
const GRADIENT_PALETTES = [
    ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Coral-Teal
    ['#A855F7', '#EC4899', '#F97316'], // Purple-Pink-Orange
    ['#3B82F6', '#8B5CF6', '#EC4899'], // Blue-Purple-Pink
    ['#10B981', '#3B82F6', '#8B5CF6'], // Green-Blue-Purple
    ['#F59E0B', '#EF4444', '#EC4899'], // Amber-Red-Pink
    ['#06B6D4', '#8B5CF6', '#F97316'], // Cyan-Purple-Orange
    ['#84CC16', '#22C55E', '#14B8A6'], // Lime-Green-Teal
    ['#F43F5E', '#D946EF', '#8B5CF6'], // Rose-Fuchsia-Purple
    ['#0EA5E9', '#6366F1', '#A855F7'], // Sky-Indigo-Purple
    ['#FBBF24', '#F59E0B', '#EF4444'], // Yellow-Amber-Red
];

/**
 * Simple hash function for wallet addresses
 */
function hashAddress(address: string): number {
    let hash = 0;
    const normalized = address.toLowerCase();
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Get gradient colors for a wallet address
 */
export function getGradientColors(address: string): string[] {
    if (!address) return GRADIENT_PALETTES[0];
    const hash = hashAddress(address);
    const paletteIndex = hash % GRADIENT_PALETTES.length;
    return GRADIENT_PALETTES[paletteIndex];
}

/**
 * Get gradient angle based on address
 */
export function getGradientAngle(address: string): number {
    if (!address) return 135;
    const hash = hashAddress(address);
    // Generate angle between 90 and 180 for pleasing diagonals
    return 90 + (hash % 90);
}

/**
 * Generate CSS gradient string for avatar background
 */
export function generateAvatarGradient(address: string): string {
    const colors = getGradientColors(address);
    const angle = getGradientAngle(address);
    return `linear-gradient(${angle}deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
}

/**
 * Generate SVG data URL for avatar
 */
export function generateAvatarSVG(address: string, size: number = 128): string {
    const colors = getGradientColors(address);
    const angle = getGradientAngle(address);

    // Convert angle to gradient coordinates
    const angleRad = (angle * Math.PI) / 180;
    const x1 = 50 - Math.cos(angleRad) * 50;
    const y1 = 50 - Math.sin(angleRad) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;

    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                    <stop offset="0%" style="stop-color:${colors[0]}" />
                    <stop offset="50%" style="stop-color:${colors[1]}" />
                    <stop offset="100%" style="stop-color:${colors[2]}" />
                </linearGradient>
            </defs>
            <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)" />
        </svg>
    `.trim().replace(/\s+/g, ' ');

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get initials from display name or address
 */
export function getAvatarInitial(displayName: string | null, address: string): string {
    if (displayName && displayName.length > 0) {
        // Get first letter of display name
        return displayName.charAt(0).toUpperCase();
    }
    // Fallback to third character of address (after 0x)
    if (address && address.length > 2) {
        return address.charAt(2).toUpperCase();
    }
    return '?';
}
