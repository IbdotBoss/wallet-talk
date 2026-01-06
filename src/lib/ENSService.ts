/**
 * ENS Service - Ethereum Name Service resolution
 * 
 * Uses Alchemy API for ENS lookups.
 * Resolves primary ENS names and avatars for wallet addresses.
 */

// Alchemy API configuration
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

interface ENSData {
    name: string | null;
    avatar: string | null;
}

// Cache for ENS lookups to reduce API calls
const ensCache = new Map<string, ENSData>();

/**
 * Resolve ENS name for a given Ethereum address
 */
export async function resolveENSName(address: string): Promise<string | null> {
    if (!address || !ALCHEMY_API_KEY) return null;

    // Check cache first
    const cached = ensCache.get(address.toLowerCase());
    if (cached !== undefined) return cached.name;

    try {
        const response = await fetch(ALCHEMY_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                    {
                        to: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C', // ENS Reverse Registrar
                        data: `0x691f3431${address.slice(2).toLowerCase().padStart(64, '0')}`
                    },
                    'latest'
                ]
            })
        });

        const data = await response.json();

        if (data.result && data.result !== '0x') {
            // Decode the ENS name from the result
            // This is a simplified decoder - in production, use ethers.js
            const name = decodeENSResult(data.result);
            ensCache.set(address.toLowerCase(), { name, avatar: null });
            return name;
        }

        ensCache.set(address.toLowerCase(), { name: null, avatar: null });
        return null;
    } catch (error) {
        console.error('ENS lookup failed:', error);
        return null;
    }
}

/**
 * Get ENS avatar for a name
 */
export async function getENSAvatar(ensName: string): Promise<string | null> {
    if (!ensName || !ALCHEMY_API_KEY) return null;

    try {
        const response = await fetch(ALCHEMY_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                    {
                        to: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41', // ENS PublicResolver
                        data: encodeAvatarCall(ensName)
                    },
                    'latest'
                ]
            })
        });

        const data = await response.json();

        if (data.result && data.result !== '0x') {
            return decodeAvatarResult(data.result);
        }

        return null;
    } catch (error) {
        console.error('ENS avatar lookup failed:', error);
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
 * Check if the ENS service is configured
 */
export function isENSConfigured(): boolean {
    return Boolean(ALCHEMY_API_KEY);
}

// Helper functions for encoding/decoding
function decodeENSResult(hexData: string): string | null {
    try {
        // Remove 0x prefix and decode
        // This is a simplified implementation
        // In production, use proper ABI decoding
        if (hexData.length < 130) return null;

        const offset = parseInt(hexData.slice(2, 66), 16) * 2 + 2;
        const length = parseInt(hexData.slice(offset, offset + 64), 16);
        const nameHex = hexData.slice(offset + 64, offset + 64 + length * 2);

        return Buffer.from(nameHex, 'hex').toString('utf8');
    } catch {
        return null;
    }
}

function encodeAvatarCall(ensName: string): string {
    // Encode the text() call for 'avatar' record
    // Simplified - in production use ethers.js
    const nameHash = namehash(ensName);
    const avatarKey = 'avatar';
    const avatarKeyHex = Buffer.from(avatarKey).toString('hex').padEnd(64, '0');
    return `0x59d1d43c${nameHash}${avatarKeyHex}`;
}

function decodeAvatarResult(hexData: string): string | null {
    try {
        if (hexData.length < 130) return null;

        const offset = parseInt(hexData.slice(2, 66), 16) * 2 + 2;
        const length = parseInt(hexData.slice(offset, offset + 64), 16);
        const dataHex = hexData.slice(offset + 64, offset + 64 + length * 2);

        return Buffer.from(dataHex, 'hex').toString('utf8');
    } catch {
        return null;
    }
}

function namehash(name: string): string {
    // Simplified namehash - in production use ethers.js
    let node = '0000000000000000000000000000000000000000000000000000000000000000';

    if (name) {
        const labels = name.split('.').reverse();
        for (const label of labels) {
            const labelHash = sha3(label);
            node = sha3(node + labelHash);
        }
    }

    return node;
}

// Simplified SHA3-256 for demo - in production use a proper library
function sha3(data: string): string {
    // This is a placeholder - in production, use keccak256
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}
