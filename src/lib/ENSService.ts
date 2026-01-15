/**
 * ENS Service - Ethereum Name Service resolution using viem
 * 
 * Uses viem for proper ENS lookups on Ethereum mainnet.
 * Resolves primary ENS names and avatars for wallet addresses.
 */

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// Public client for ENS lookups (uses public RPC)
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http('https://eth.llamarpc.com'), // Free public RPC
});

export interface ENSData {
    name: string | null;
    avatar: string | null;
}

// Cache for ENS lookups to reduce RPC calls
const ensCache = new Map<string, ENSData>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const cacheTimestamps = new Map<string, number>();

/**
 * Check if cache entry is still valid
 */
function isCacheValid(address: string): boolean {
    const timestamp = cacheTimestamps.get(address.toLowerCase());
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Resolve ENS name for a given Ethereum address (reverse lookup)
 */
export async function resolveENSName(address: string): Promise<string | null> {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();

    // Check cache first
    if (isCacheValid(normalizedAddress)) {
        const cached = ensCache.get(normalizedAddress);
        if (cached !== undefined) return cached.name;
    }

    try {
        const name = await publicClient.getEnsName({
            address: address as `0x${string}`,
        });

        // Cache the result
        ensCache.set(normalizedAddress, { name, avatar: null });
        cacheTimestamps.set(normalizedAddress, Date.now());

        console.log('[ENS] Resolved', address.slice(0, 10) + '...', '->', name || '(no ENS)');
        return name;
    } catch (error) {
        console.error('[ENS] Lookup failed:', error);
        // Cache negative result to avoid repeated failed lookups
        ensCache.set(normalizedAddress, { name: null, avatar: null });
        cacheTimestamps.set(normalizedAddress, Date.now());
        return null;
    }
}

/**
 * Get ENS avatar for a name
 */
export async function getENSAvatar(ensName: string): Promise<string | null> {
    if (!ensName) return null;

    try {
        const avatar = await publicClient.getEnsAvatar({
            name: normalize(ensName),
        });

        // Update cache with avatar
        const address = await resolveENSAddress(ensName);
        if (address) {
            const cached = ensCache.get(address.toLowerCase()) || { name: ensName, avatar: null };
            ensCache.set(address.toLowerCase(), { ...cached, avatar });
        }

        return avatar;
    } catch (error) {
        console.error('[ENS] Avatar lookup failed:', error);
        return null;
    }
}

/**
 * Resolve ENS name to address (forward lookup)
 */
export async function resolveENSAddress(ensName: string): Promise<string | null> {
    if (!ensName) return null;

    try {
        const address = await publicClient.getEnsAddress({
            name: normalize(ensName),
        });
        return address;
    } catch (error) {
        console.error('[ENS] Address lookup failed:', error);
        return null;
    }
}

/**
 * Lookup both ENS name and avatar for an address
 */
export async function lookupENS(address: string): Promise<ENSData> {
    const name = await resolveENSName(address);

    if (!name) {
        return { name: null, avatar: null };
    }

    const avatar = await getENSAvatar(name);
    return { name, avatar };
}

/**
 * Batch lookup ENS names for multiple addresses
 */
export async function batchLookupENS(addresses: string[]): Promise<Map<string, ENSData>> {
    const results = new Map<string, ENSData>();

    // Process in parallel with concurrency limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (address) => {
            const data = await lookupENS(address);
            results.set(address.toLowerCase(), data);
        });
        await Promise.all(promises);
    }

    return results;
}

/**
 * Check if ENS is available (always true with viem)
 */
export function isENSConfigured(): boolean {
    return true;
}

/**
 * Clear the ENS cache
 */
export function clearENSCache(): void {
    ensCache.clear();
    cacheTimestamps.clear();
}

/**
 * Get cached ENS data without making a request
 */
export function getCachedENS(address: string): ENSData | null {
    if (!address) return null;
    const cached = ensCache.get(address.toLowerCase());
    if (cached && isCacheValid(address.toLowerCase())) {
        return cached;
    }
    return null;
}
