/**
 * IPFS Upload Service
 * 
 * Handles uploading profile pictures to IPFS via Pinata or nft.storage.
 * Uses environment variables for API keys.
 */

// Pinata configuration (common choice for IPFS)
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

// Alternative: nft.storage
const NFT_STORAGE_KEY = import.meta.env.VITE_NFT_STORAGE_KEY || '';

interface UploadResult {
    success: boolean;
    cid?: string;
    url?: string;
    error?: string;
}

/**
 * Check if IPFS service is configured
 */
export function isIPFSConfigured(): boolean {
    return Boolean(PINATA_JWT || NFT_STORAGE_KEY);
}

/**
 * Get the preferred IPFS provider
 */
export function getIPFSProvider(): 'pinata' | 'nft.storage' | null {
    if (PINATA_JWT) return 'pinata';
    if (NFT_STORAGE_KEY) return 'nft.storage';
    return null;
}

/**
 * Upload an image to IPFS via Pinata
 */
async function uploadToPinata(imageDataUrl: string, filename: string = 'avatar.jpg'): Promise<UploadResult> {
    try {
        // Convert data URL to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        // Create form data
        const formData = new FormData();
        formData.append('file', blob, filename);

        // Upload to Pinata
        const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
            },
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Pinata upload failed: ${uploadResponse.statusText}`);
        }

        const data = await uploadResponse.json();
        const cid = data.IpfsHash;

        // Construct the proper gateway URL
        // PINATA_GATEWAY should be your dedicated gateway subdomain (e.g., pink-elaborate-tiger-123.mypinata.cloud)
        // or a full URL. We need to construct: https://{gateway}/ipfs/{cid}
        let gatewayUrl: string;
        if (PINATA_GATEWAY.startsWith('http://') || PINATA_GATEWAY.startsWith('https://')) {
            // Full URL provided - just append /ipfs/cid if not already formatted
            const gateway = PINATA_GATEWAY.endsWith('/') ? PINATA_GATEWAY.slice(0, -1) : PINATA_GATEWAY;
            gatewayUrl = `${gateway}/ipfs/${cid}`;
        } else {
            // Just the gateway subdomain provided (e.g., pink-elaborate-tiger-123.mypinata.cloud)
            gatewayUrl = `https://${PINATA_GATEWAY}/ipfs/${cid}`;
        }

        return {
            success: true,
            cid,
            url: gatewayUrl,
        };
    } catch (error) {
        console.error('Pinata upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

/**
 * Upload an image to IPFS via nft.storage
 */
async function uploadToNFTStorage(imageDataUrl: string): Promise<UploadResult> {
    try {
        // Convert data URL to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        // Upload to nft.storage
        const uploadResponse = await fetch('https://api.nft.storage/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NFT_STORAGE_KEY}`,
                'Content-Type': blob.type,
            },
            body: blob,
        });

        if (!uploadResponse.ok) {
            throw new Error(`nft.storage upload failed: ${uploadResponse.statusText}`);
        }

        const data = await uploadResponse.json();
        const cid = data.value.cid;

        return {
            success: true,
            cid,
            url: `https://nftstorage.link/ipfs/${cid}`,
        };
    } catch (error) {
        console.error('nft.storage upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

/**
 * Upload an image to IPFS using the configured provider
 */
export async function uploadToIPFS(imageDataUrl: string, filename?: string): Promise<UploadResult> {
    const provider = getIPFSProvider();

    if (!provider) {
        return {
            success: false,
            error: 'IPFS not configured. Add VITE_PINATA_JWT or VITE_NFT_STORAGE_KEY to .env',
        };
    }

    if (provider === 'pinata') {
        return uploadToPinata(imageDataUrl, filename);
    } else {
        return uploadToNFTStorage(imageDataUrl);
    }
}

/**
 * Convert IPFS URL to gateway URL for display
 */
export function ipfsToHttpUrl(ipfsUrl: string): string {
    if (!ipfsUrl) return '';

    // Already a HTTP URL
    if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
        return ipfsUrl;
    }

    // Helper to construct gateway URL
    const constructGatewayUrl = (cid: string): string => {
        if (PINATA_GATEWAY.startsWith('http://') || PINATA_GATEWAY.startsWith('https://')) {
            const gateway = PINATA_GATEWAY.endsWith('/') ? PINATA_GATEWAY.slice(0, -1) : PINATA_GATEWAY;
            return `${gateway}/ipfs/${cid}`;
        } else {
            // Just the gateway subdomain provided
            return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
        }
    };

    // ipfs:// protocol
    if (ipfsUrl.startsWith('ipfs://')) {
        const cid = ipfsUrl.replace('ipfs://', '');
        return constructGatewayUrl(cid);
    }

    // Just a CID
    if (ipfsUrl.startsWith('Qm') || ipfsUrl.startsWith('bafy')) {
        return constructGatewayUrl(ipfsUrl);
    }

    return ipfsUrl;
}

/**
 * Validate that a URL points to an image
 */
export async function validateImageUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return response.ok && Boolean(contentType?.startsWith('image/'));
    } catch {
        return false;
    }
}
