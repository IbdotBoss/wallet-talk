/**
 * UsernameGenerator - Generates immutable @Handles
 * 
 * Pattern: @AdjectiveNounNumber (e.g., @NeonViper92)
 * Handles are local-only aliases mapped to wallet addresses.
 */

import { logSecurityEvent } from './SecurityService';

// Curated word lists for premium-feeling handles
const ADJECTIVES = [
    'Neon', 'Cosmic', 'Quantum', 'Cyber', 'Crystal', 'Shadow', 'Stellar', 'Nova',
    'Phantom', 'Lunar', 'Solar', 'Atomic', 'Violet', 'Azure', 'Crimson', 'Emerald',
    'Swift', 'Silent', 'Mystic', 'Digital', 'Prism', 'Echo', 'Frost', 'Storm',
    'Thunder', 'Blaze', 'Spark', 'Drift', 'Flux', 'Pulse', 'Zen', 'Apex',
    'Omega', 'Alpha', 'Prime', 'Elite', 'Ultra', 'Hyper', 'Turbo', 'Nitro',
];

const NOUNS = [
    'Viper', 'Phoenix', 'Dragon', 'Wolf', 'Hawk', 'Raven', 'Tiger', 'Panther',
    'Falcon', 'Eagle', 'Shark', 'Lion', 'Bear', 'Fox', 'Lynx', 'Cobra',
    'Cipher', 'Byte', 'Node', 'Core', 'Nexus', 'Vertex', 'Matrix', 'Vector',
    'Helix', 'Orbit', 'Pulse', 'Spark', 'Wave', 'Forge', 'Void', 'Nova',
    'Blade', 'Storm', 'Frost', 'Flame', 'Shadow', 'Light', 'Star', 'Moon',
];

// LocalStorage key for handle → address mapping
const HANDLE_STORAGE_KEY = 'antigravity_handles';

interface HandleMapping {
    [handle: string]: string; // handle → address
}

/**
 * Generates a cryptographically random integer in range [min, max)
 */
function secureRandomInt(min: number, max: number): number {
    const range = max - min;
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % range);
}

/**
 * Generates a new unique handle
 */
export function generateHandle(): string {
    const adjective = ADJECTIVES[secureRandomInt(0, ADJECTIVES.length)];
    const noun = NOUNS[secureRandomInt(0, NOUNS.length)];
    const number = secureRandomInt(10, 100); // Two-digit number

    return `@${adjective}${noun}${number}`;
}

/**
 * Gets all handle mappings from storage
 */
function getHandleMappings(): HandleMapping {
    try {
        const stored = localStorage.getItem(HANDLE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Saves handle mappings to storage
 */
function saveHandleMappings(mappings: HandleMapping): void {
    try {
        localStorage.setItem(HANDLE_STORAGE_KEY, JSON.stringify(mappings));
    } catch (error) {
        logSecurityEvent('Failed to save handle mapping', { error });
    }
}

/**
 * Gets the handle for an address, or null if not found
 */
export function getHandleForAddress(address: string): string | null {
    const mappings = getHandleMappings();

    // Reverse lookup: find handle by address
    for (const [handle, addr] of Object.entries(mappings)) {
        if (addr.toLowerCase() === address.toLowerCase()) {
            return handle;
        }
    }

    return null;
}

/**
 * Gets the address for a handle, or null if not found
 */
export function getAddressForHandle(handle: string): string | null {
    const mappings = getHandleMappings();
    return mappings[handle] || null;
}

/**
 * Registers a new handle for an address
 * Returns the handle (may generate a new one if none exists)
 */
export function registerHandle(address: string): string {
    // Check if address already has a handle
    const existing = getHandleForAddress(address);
    if (existing) {
        return existing;
    }

    // Generate new handle
    const mappings = getHandleMappings();
    let handle = generateHandle();

    // Ensure uniqueness (regenerate if collision)
    while (mappings[handle]) {
        handle = generateHandle();
    }

    // Save mapping
    mappings[handle] = address.toLowerCase();
    saveHandleMappings(mappings);

    logSecurityEvent('Handle registered', { handle, address: address.slice(0, 10) + '...' });

    return handle;
}

/**
 * Clears all handle mappings (for testing or account reset)
 */
export function clearHandleMappings(): void {
    try {
        localStorage.removeItem(HANDLE_STORAGE_KEY);
    } catch {
        // Silent fail
    }
}
