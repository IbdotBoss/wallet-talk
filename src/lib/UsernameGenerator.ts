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

// Playful word lists for shuffle handles (more fun, less techy)
const PLAYFUL_ADJECTIVES = [
    'Neon', 'Cosmic', 'Funky', 'Lucky', 'Happy', 'Chill', 'Wild', 'Cool',
    'Sunny', 'Starry', 'Dreamy', 'Groovy', 'Jazzy', 'Peppy', 'Snazzy', 'Zesty',
    'Fizzy', 'Zippy', 'Breezy', 'Misty', 'Velvet', 'Candy', 'Pixel', 'Retro',
];

const PLAYFUL_NOUNS = [
    'Void', 'City', 'Wave', 'Moon', 'Star', 'Cloud', 'Dream', 'Vibe',
    'Glow', 'Spark', 'Flash', 'Dash', 'Breeze', 'Storm', 'Comet', 'Orbit',
    'Pixel', 'Disco', 'Blaze', 'Echo', 'Pulse', 'Drift', 'Frost', 'Bloom',
];


// LocalStorage key for handle → address mapping

/**
 * Safe localStorage access with try/catch for private/incognito mode support.
 * Safari private mode throws QUOTA_EXCEEDED_ERROR on any setItem/getItem.
 */
const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return safeLocalStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      safeLocalStorage.setItem(key, value);
    } catch {
      // Silently fail in private mode where storage is disabled
    }
  },
  removeItem(key: string): void {
    try {
      safeLocalStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

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
        const stored = safeLocalStorage.getItem(HANDLE_STORAGE_KEY);
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
        safeLocalStorage.setItem(HANDLE_STORAGE_KEY, JSON.stringify(mappings));
    } catch (error) {
        logSecurityEvent('Failed to save handle mapping', { error });
    }
}

/**
 * Gets the handle for an address, or null if not found
 */
export function getHandleForAddress(address: string): string | null {
    // Guard against undefined/null address
    if (!address) {
        return null;
    }

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
        safeLocalStorage.removeItem(HANDLE_STORAGE_KEY);
    } catch {
        // Silent fail
    }
}

/**
 * Generates a playful shuffle handle (user-friendly format)
 * Pattern: Adjective-Noun or Adjective-Noun-Number
 * Examples: "Neon-Void", "Cosmic-City", "Funky-Wave-42"
 */
export function generateShuffleHandle(includeNumber: boolean = true): string {
    const adjective = PLAYFUL_ADJECTIVES[secureRandomInt(0, PLAYFUL_ADJECTIVES.length)];
    const noun = PLAYFUL_NOUNS[secureRandomInt(0, PLAYFUL_NOUNS.length)];

    if (includeNumber) {
        const number = secureRandomInt(10, 100);
        return `${adjective}-${noun}-${number}`;
    }

    return `${adjective}-${noun}`;
}

/**
 * Updates the display name for an address
 * This is the user-chosen name, not the @handle
 */
export function updateDisplayName(address: string, displayName: string): void {
    if (!address) return;

    const key = `antigravity_displayname_${address.toLowerCase()}`;
    try {
        safeLocalStorage.setItem(key, displayName);
    } catch (error) {
        logSecurityEvent('Failed to save display name', { error });
    }
}

/**
 * Gets the display name for an address
 */
export function getDisplayName(address: string): string | null {
    if (!address) return null;

    const key = `antigravity_displayname_${address.toLowerCase()}`;
    try {
        return safeLocalStorage.getItem(key);
    } catch {
        return null;
    }
}
