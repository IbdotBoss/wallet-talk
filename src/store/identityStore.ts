/**
 * Identity Store - Zustand state management for user identity
 * 
 * Manages display name, avatar, and identity metadata.
 * Wallet address is the permanent unique ID.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AvatarType = 'generative' | 'ens' | 'nft' | 'custom';

export interface Identity {
    walletAddress: string;      // Permanent unique ID
    displayName: string;        // User-chosen or shuffled
    avatarUrl: string | null;   // IPFS URL, ENS avatar, or null (use generative)
    avatarType: AvatarType;
    ensName: string | null;     // e.g., "alice.eth"
    createdAt: number;          // Timestamp
    updatedAt: number;          // Timestamp
}

interface IdentityState {
    // State
    identity: Identity | null;
    isLoading: boolean;

    // Actions
    setIdentity: (identity: Identity) => void;
    updateDisplayName: (displayName: string) => void;
    updateAvatar: (avatarUrl: string | null, avatarType: AvatarType) => void;
    setENSName: (ensName: string | null) => void;
    clearIdentity: () => void;
    setLoading: (loading: boolean) => void;
}

export const useIdentityStore = create<IdentityState>()(
    persist(
        (set) => ({
            identity: null,
            isLoading: false,

            setIdentity: (identity) => set({ identity }),

            updateDisplayName: (displayName) => set((state) => ({
                identity: state.identity ? {
                    ...state.identity,
                    displayName,
                    updatedAt: Date.now(),
                } : null,
            })),

            updateAvatar: (avatarUrl, avatarType) => set((state) => ({
                identity: state.identity ? {
                    ...state.identity,
                    avatarUrl,
                    avatarType,
                    updatedAt: Date.now(),
                } : null,
            })),

            setENSName: (ensName) => set((state) => ({
                identity: state.identity ? {
                    ...state.identity,
                    ensName,
                    updatedAt: Date.now(),
                } : null,
            })),

            clearIdentity: () => set({ identity: null }),

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'antigravity-identity',
        }
    )
);

/**
 * Create a new identity for a wallet address
 */
export function createIdentity(walletAddress: string, displayName: string): Identity {
    return {
        walletAddress: walletAddress.toLowerCase(),
        displayName,
        avatarUrl: null,
        avatarType: 'generative',
        ensName: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}
