/**
 * Peer Profile Store - Zustand state management for received peer profiles
 * 
 * Stores profiles received from other users via XMTP messages.
 * Includes ENS data fetched for peers.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PeerProfile {
    address: string;
    displayName: string | null;
    avatarUrl: string | null;
    ensName: string | null;
    ensAvatar: string | null;
    updatedAt: number;
}

interface PeerProfileState {
    // State
    profiles: Record<string, PeerProfile>;

    // Actions
    setProfile: (address: string, profile: Partial<PeerProfile>) => void;
    getProfile: (address: string) => PeerProfile | null;
    setENSData: (address: string, ensName: string | null, ensAvatar: string | null) => void;
    removeProfile: (address: string) => void;
    clearAllProfiles: () => void;

    // Computed
    getDisplayName: (address: string) => string | null;
}

export const usePeerProfileStore = create<PeerProfileState>()(
    persist(
        (set, get) => ({
            profiles: {},

            setProfile: (address, profileData) => set((state) => {
                const normalizedAddress = address.toLowerCase();
                const existing = state.profiles[normalizedAddress] || {
                    address: normalizedAddress,
                    displayName: null,
                    avatarUrl: null,
                    ensName: null,
                    ensAvatar: null,
                    updatedAt: Date.now(),
                };

                return {
                    profiles: {
                        ...state.profiles,
                        [normalizedAddress]: {
                            ...existing,
                            ...profileData,
                            address: normalizedAddress,
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            getProfile: (address) => {
                if (!address) return null;
                return get().profiles[address.toLowerCase()] || null;
            },

            setENSData: (address, ensName, ensAvatar) => set((state) => {
                const normalizedAddress = address.toLowerCase();
                const existing = state.profiles[normalizedAddress] || {
                    address: normalizedAddress,
                    displayName: null,
                    avatarUrl: null,
                    ensName: null,
                    ensAvatar: null,
                    updatedAt: Date.now(),
                };

                return {
                    profiles: {
                        ...state.profiles,
                        [normalizedAddress]: {
                            ...existing,
                            ensName,
                            ensAvatar,
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            removeProfile: (address) => set((state) => {
                const normalized = address.toLowerCase();
                const { [normalized]: _, ...rest } = state.profiles;
                return { profiles: rest };
            }),

            clearAllProfiles: () => set({ profiles: {} }),

            /**
             * Get the best display name for an address.
             * Priority: ENS name > displayName > null
             */
            getDisplayName: (address) => {
                if (!address) return null;
                const profile = get().profiles[address.toLowerCase()];
                if (!profile) return null;

                // ENS name takes priority
                if (profile.ensName) return profile.ensName;
                // Then user-set display name
                if (profile.displayName) return profile.displayName;

                return null;
            },
        }),
        {
            name: 'antigravity-peer-profiles',
        }
    )
);

/**
 * Hook to get a peer's display name with fallback
 */
export function getPeerDisplayName(address: string | null | undefined): string | null {
    if (!address) return null;
    return usePeerProfileStore.getState().getDisplayName(address);
}

/**
 * Get the best avatar URL for an address
 */
export function getPeerAvatar(address: string | null | undefined): string | null {
    if (!address) return null;
    const profile = usePeerProfileStore.getState().getProfile(address);
    if (!profile) return null;

    // ENS avatar takes priority, then custom avatar
    return profile.ensAvatar || profile.avatarUrl || null;
}
