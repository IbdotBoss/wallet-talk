/**
 * BlocklistService - Address blocking for spam/harassment prevention
 * 
 * Blocked addresses are filtered out locally during message fetch.
 * Persisted to LocalStorage (preferences only, not keys).
 */

import { validateAddress, logSecurityEvent } from './SecurityService';


/**
 * Safe localStorage access with try/catch for private/incognito mode support.
 * Safari private mode throws QUOTA_EXCEEDED_ERROR on any storage operation.
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
      // Silently fail in private mode
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

const BLOCKLIST_STORAGE_KEY = 'antigravity_blocklist';

/**
 * Gets the blocklist from storage
 */
function getBlocklist(): Set<string> {
    try {
        const stored = safeLocalStorage.getItem(BLOCKLIST_STORAGE_KEY);
        if (!stored) return new Set();

        const addresses: string[] = JSON.parse(stored);
        return new Set(addresses.map((a) => a.toLowerCase()));
    } catch {
        return new Set();
    }
}

/**
 * Saves the blocklist to storage
 */
function saveBlocklist(blocklist: Set<string>): void {
    try {
        const addresses = Array.from(blocklist);
        safeLocalStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(addresses));
    } catch (error) {
        logSecurityEvent('Failed to save blocklist', { error });
    }
}

/**
 * Adds an address to the blocklist
 */
export function addToBlocklist(address: string): boolean {
    if (!validateAddress(address)) {
        logSecurityEvent('Invalid address for blocklist', { address });
        return false;
    }

    const blocklist = getBlocklist();
    const normalizedAddress = address.toLowerCase();

    if (blocklist.has(normalizedAddress)) {
        return true; // Already blocked
    }

    blocklist.add(normalizedAddress);
    saveBlocklist(blocklist);

    logSecurityEvent('Address blocked', { address: normalizedAddress });
    return true;
}

/**
 * Removes an address from the blocklist
 */
export function removeFromBlocklist(address: string): boolean {
    if (!validateAddress(address)) {
        return false;
    }

    const blocklist = getBlocklist();
    const normalizedAddress = address.toLowerCase();

    if (!blocklist.has(normalizedAddress)) {
        return true; // Already unblocked
    }

    blocklist.delete(normalizedAddress);
    saveBlocklist(blocklist);

    logSecurityEvent('Address unblocked', { address: normalizedAddress });
    return true;
}

/**
 * Checks if an address is blocked
 */
export function isBlocked(address: string): boolean {
    if (!validateAddress(address)) {
        return false;
    }

    const blocklist = getBlocklist();
    return blocklist.has(address.toLowerCase());
}

/**
 * Gets all blocked addresses
 */
export function getBlockedAddresses(): string[] {
    return Array.from(getBlocklist());
}

/**
 * Clears the entire blocklist
 */
export function clearBlocklist(): void {
    try {
        safeLocalStorage.removeItem(BLOCKLIST_STORAGE_KEY);
        logSecurityEvent('Blocklist cleared');
    } catch {
        // Silent fail
    }
}

/**
 * Gets the count of blocked addresses
 */
export function getBlocklistCount(): number {
    return getBlocklist().size;
}
