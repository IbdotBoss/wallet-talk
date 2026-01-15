/**
 * Profile Service - XMTP Profile Message Handling
 * 
 * Sends and receives profile data via XMTP messages.
 * Profile messages are prefixed with a special marker to distinguish from regular messages.
 */

import { usePeerProfileStore } from '../store/peerProfileStore';
import { useIdentityStore } from '../store/identityStore';
import { lookupENS } from './ENSService';

// Profile message prefix - allows backward compatibility with text messages
const PROFILE_MESSAGE_PREFIX = '🪪PROFILE:';

export interface ProfilePayload {
    type: 'profile';
    displayName: string | null;
    avatarUrl: string | null;
    ensName: string | null;
    updatedAt: number;
    version: number;
}

/**
 * Create a profile message payload from current user identity
 */
export function createProfilePayload(): ProfilePayload {
    const identity = useIdentityStore.getState().identity;

    return {
        type: 'profile',
        displayName: identity?.displayName || null,
        avatarUrl: identity?.avatarUrl || null,
        ensName: identity?.ensName || null,
        updatedAt: Date.now(),
        version: 1,
    };
}

/**
 * Encode a profile payload into a message string
 */
export function encodeProfileMessage(payload: ProfilePayload): string {
    return PROFILE_MESSAGE_PREFIX + JSON.stringify(payload);
}

/**
 * Check if a message is a profile message
 */
export function isProfileMessage(content: string): boolean {
    return typeof content === 'string' && content.startsWith(PROFILE_MESSAGE_PREFIX);
}

/**
 * Decode a profile message string into a payload
 */
export function decodeProfileMessage(content: string): ProfilePayload | null {
    if (!isProfileMessage(content)) return null;

    try {
        const jsonStr = content.slice(PROFILE_MESSAGE_PREFIX.length);
        const payload = JSON.parse(jsonStr) as ProfilePayload;

        // Validate payload structure
        if (payload.type !== 'profile') return null;

        return payload;
    } catch (error) {
        console.error('[Profile] Failed to decode profile message:', error);
        return null;
    }
}

/**
 * Handle an incoming profile message from a peer
 */
export function handleIncomingProfile(senderAddress: string, content: string): boolean {
    const payload = decodeProfileMessage(content);
    if (!payload) return false;

    const store = usePeerProfileStore.getState();
    const existing = store.getProfile(senderAddress);

    // Only update if newer
    if (existing && existing.updatedAt >= payload.updatedAt) {
        console.log('[Profile] Ignoring older profile from', senderAddress.slice(0, 8));
        return true; // Still return true since it was a valid profile message
    }

    // Update peer profile store
    store.setProfile(senderAddress, {
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        ensName: payload.ensName,
    });

    console.log('[Profile] Updated profile for', senderAddress.slice(0, 8), '->', payload.displayName || payload.ensName);
    return true;
}

/**
 * Fetch and store ENS data for a peer address
 */
export async function fetchAndStorePeerENS(address: string): Promise<void> {
    if (!address) return;

    const store = usePeerProfileStore.getState();
    const existing = store.getProfile(address);

    // Skip if we already have ENS data
    if (existing?.ensName) return;

    try {
        const ensData = await lookupENS(address);

        if (ensData.name || ensData.avatar) {
            store.setENSData(address, ensData.name, ensData.avatar);
            console.log('[Profile] Fetched ENS for', address.slice(0, 8), '->', ensData.name);
        }
    } catch (error) {
        console.error('[Profile] ENS lookup failed for', address.slice(0, 8), error);
    }
}

/**
 * Create and encode a profile message ready to send
 */
export function createProfileMessage(): string {
    const payload = createProfilePayload();
    return encodeProfileMessage(payload);
}

/**
 * Filter profile messages from a message list
 * Returns only non-profile messages for display
 */
export function filterProfileMessages<T extends { content: string }>(messages: T[]): T[] {
    return messages.filter(msg => !isProfileMessage(msg.content));
}

/**
 * Process messages and extract any profile updates
 * Returns the sender address -> profile mapping for any profile messages found
 */
export function processMessagesForProfiles<T extends { content: string; senderAddress?: string }>(
    messages: T[]
): void {
    for (const msg of messages) {
        if (msg.senderAddress && isProfileMessage(msg.content)) {
            handleIncomingProfile(msg.senderAddress, msg.content);
        }
    }
}
