/**
 * XMTP Client Store - Global state management for XMTP client
 * 
 * Uses Zustand to persist the XMTP client across page navigation.
 * The client is stored globally so it survives React component unmounts.
 */

import { create } from 'zustand';
import type { Client } from '@xmtp/browser-sdk';

interface XMTPState {
    // Client state
    client: Client | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    
    // Connection metadata
    connectedAddress: string | null;
    connectionTimestamp: number | null;
    
    // Actions
    setClient: (client: Client | null, address?: string) => void;
    setConnecting: (isConnecting: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useXMTPStore = create<XMTPState>((set) => ({
    // Initial state
    client: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    connectedAddress: null,
    connectionTimestamp: null,
    
    // Actions
    setClient: (client, address) => set({
        client,
        isConnected: !!client,
        connectedAddress: address || null,
        connectionTimestamp: client ? Date.now() : null,
        error: null,
    }),
    
    setConnecting: (isConnecting) => set({ isConnecting }),
    
    setError: (error) => set({ error }),
    
    reset: () => set({
        client: null,
        isConnecting: false,
        isConnected: false,
        error: null,
        connectedAddress: null,
        connectionTimestamp: null,
    }),
}));

// Singleton reference for the actual client object (survives React re-renders)
let globalXMTPClient: Client | null = null;

export const getGlobalXMTPClient = (): Client | null => globalXMTPClient;

export const setGlobalXMTPClient = (client: Client | null): void => {
    globalXMTPClient = client;
};
