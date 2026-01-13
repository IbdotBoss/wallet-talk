/**
 * XMTP Client Store - Global state management for XMTP client
 * 
 * Uses Zustand to persist the XMTP client across page navigation.
 * The client is stored globally so it survives React component unmounts.
 */

import { create } from 'zustand';
import type { Client } from '@xmtp/browser-sdk';

// Use 'any' for client to support both real Client and MockClient types
interface XMTPState {
    // Client state - using any to support MockClient in development
    client: any | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    
    // Connection metadata
    connectedAddress: string | null;
    connectionTimestamp: number | null;
    
    // Actions
    setClient: (client: any | null, address?: string) => void;
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
// Using any to support both Client and MockClient
let globalXMTPClient: any | null = null;

export const getGlobalXMTPClient = (): any | null => globalXMTPClient;

export const setGlobalXMTPClient = (client: any | null): void => {
    globalXMTPClient = client;
};
