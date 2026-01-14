/**
 * useSecureXMTP - XMTP V3 client hook with Privy integration
 * 
 * Uses @xmtp/browser-sdk (V3) with proper signer format.
 * Supports both DM and Group conversations.
 * Includes MOCK MODE for UI verification when network is unstable.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// Dynamic import - SDK loaded only when needed to prevent WASM blocking React mount
// Types are imported for TypeScript, actual SDK is dynamically imported in connect()
import type { Client, Signer, Conversation, Group } from '@xmtp/browser-sdk';
import { toBytes } from 'viem'; // Use viem's toBytes like official xmtp.chat
import { useMessageStore, type Message as StoreMessage, type Conversation as StoreConversation } from '@/store/messageStore';
import { sanitizeMessage, validateAddress, logSecurityEvent } from '@/lib/SecurityService';
import { useXMTPStore, getGlobalXMTPClient, setGlobalXMTPClient } from '@/store/xmtpStore';

// App version for XMTP analytics (recommended by XMTP docs)
const APP_VERSION = 'wallet-talk/1.0.0';

// Connection timeout in milliseconds (increased for slow connections)
const CONNECTION_TIMEOUT_MS = 60000; // 60 seconds

// Max retry attempts for connection
const MAX_CONNECTION_RETRIES = 3;

// Toggle for development - set to true to test UI without real XMTP
// Set to false for production to use real XMTP network
const USE_MOCK_XMTP = false; // Testing with real XMTP using xmtp.chat-style config

// Note: hexToBytes removed - using viem's toBytes instead (matches xmtp.chat)

// SDK module references - populated on first connect via dynamic import
let XMTPClient: typeof import('@xmtp/browser-sdk').Client | null = null;
let XMTPConsentState: typeof import('@xmtp/browser-sdk').ConsentState | null = null;

// Helper to load SDK dynamically
async function loadXMTPSDK() {
    if (!XMTPClient || !XMTPConsentState) {
        console.log('[XMTP] Loading browser SDK dynamically...');
        const sdk = await import('@xmtp/browser-sdk');
        XMTPClient = sdk.Client;
        XMTPConsentState = sdk.ConsentState;
        console.log('[XMTP] SDK loaded successfully');
    }
    return { Client: XMTPClient, ConsentState: XMTPConsentState };
}

// Helper to get or create database encryption key for OPFS persistence
const getOrCreateDbEncryptionKey = async (address: string): Promise<Uint8Array> => {
    const storageKey = `xmtp-db-key-${address.toLowerCase()}`;
    let keyHex = localStorage.getItem(storageKey);

    if (!keyHex) {
        const key = crypto.getRandomValues(new Uint8Array(32));
        keyHex = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(storageKey, keyHex);
    }

    // Convert hex string to Uint8Array
    const matches = keyHex.match(/.{2}/g);
    if (!matches) {
        // If invalid hex format, regenerate key
        const key = crypto.getRandomValues(new Uint8Array(32));
        keyHex = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(storageKey, keyHex);
        return key;
    }

    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
};

// Helper to resolve Ethereum address to inbox ID using XMTP V3 API
const getInboxIdFromAddress = async (client: Client, address: string): Promise<string | null> => {
    try {
        const inboxId = await client.findInboxIdByIdentifier({
            identifier: address.toLowerCase(),
            identifierKind: 'Ethereum',
        });
        return inboxId || null;
    } catch (err) {
        console.error('[XMTP] Failed to get inbox ID for address:', address, err);
        return null;
    }
};

// ============================================================================
// MOCK CLASSES FOR TESTING
// ============================================================================

class MockConversation {
    peerInboxId: string;
    id: string;
    type: 'dm' | 'group' = 'dm';

    constructor(peerAddress: string) {
        this.peerInboxId = peerAddress;
        this.id = `mock-dm-${peerAddress}-${Date.now()}`;
    }

    async messages(_opts?: any) { return []; }
    async send(content: string) {
        return { id: Date.now().toString(), sentAtNs: BigInt(Date.now() * 1000000), content };
    }
    async sync() { }
}

class MockGroup {
    id: string;
    name: string;
    imageUrl: string;
    description: string;
    members: { inboxId: string; address: string }[] = [];
    type: 'dm' | 'group' = 'group';

    constructor(name: string, memberAddresses: string[]) {
        this.id = `mock-group-${Date.now()}`;
        this.name = name;
        this.imageUrl = '';
        this.description = '';
        this.members = memberAddresses.map(addr => ({ inboxId: addr, address: addr }));
    }

    async messages(_opts?: any) { return []; }
    async send(content: string) {
        return { id: Date.now().toString(), sentAtNs: BigInt(Date.now() * 1000000), content };
    }
    async sync() { }
    async addMembers(inboxIds: string[]) {
        inboxIds.forEach(id => this.members.push({ inboxId: id, address: id }));
    }
    async removeMembers(inboxIds: string[]) {
        this.members = this.members.filter(m => !inboxIds.includes(m.inboxId));
    }
    async leaveGroup() { }
    async updateName(name: string) { this.name = name; }
    async updateImageUrl(url: string) { this.imageUrl = url; }
    async updateDescription(desc: string) { this.description = desc; }
}

class MockClient {
    address: string;
    inboxId: string;
    private mockGroups: MockGroup[] = [];
    private mockDms: MockConversation[] = [];

    conversations: {
        list: () => Promise<(MockConversation | MockGroup)[]>;
        listDms: () => Promise<MockConversation[]>;
        listGroups: () => Promise<MockGroup[]>;
        newDm: (peer: string) => Promise<MockConversation>;
        newGroup: (inboxIds: string[], options?: any) => Promise<MockGroup>;
        getConversationById: (id: string) => Promise<MockConversation | MockGroup | null>;
        streamAllMessages: () => AsyncGenerator<any>;
        syncAll: () => Promise<void>;
    };

    constructor(address: string) {
        this.address = address;
        this.inboxId = address;

        const self = this;
        this.conversations = {
            list: async () => [...self.mockDms, ...self.mockGroups],
            listDms: async () => self.mockDms,
            listGroups: async () => self.mockGroups,
            newDm: async (peer: string) => {
                const dm = new MockConversation(peer);
                self.mockDms.push(dm);
                return dm;
            },
            newGroup: async (inboxIds: string[], options?: any) => {
                const group = new MockGroup(options?.name || 'New Group', inboxIds);
                if (options?.imageUrl) group.imageUrl = options.imageUrl;
                if (options?.description) group.description = options.description;
                self.mockGroups.push(group);
                return group;
            },
            getConversationById: async (id: string) => {
                return self.mockDms.find(d => d.id === id) ||
                    self.mockGroups.find(g => g.id === id) ||
                    null;
            },
            streamAllMessages: async function* () {
                await new Promise(r => setTimeout(r, 100));
            },
            syncAll: async () => { },
        };
    }

    async canMessage(identifiers: { identifier: string; identifierKind: string }[]) {
        const result = new Map<string, boolean>();
        identifiers.forEach(i => result.set(i.identifier.toLowerCase(), true));
        return result;
    }

    static async canMessage(identifiers: { identifier: string; identifierKind: string }[]) {
        const result = new Map<string, boolean>();
        identifiers.forEach(i => result.set(i.identifier.toLowerCase(), true));
        return result;
    }
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GroupOptions {
    name?: string;
    imageUrl?: string;
    description?: string;
}

export interface GroupMember {
    inboxId: string;
    address: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
}

interface UseSecureXMTPReturn {
    // State
    client: Client | MockClient | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;

    // Core methods
    connect: () => Promise<void>;
    disconnect: () => void;
    resetConnection: () => void;

    // DM methods
    sendMessage: (peerAddress: string, content: string) => Promise<boolean>;
    startConversation: (peerAddress: string) => Promise<Conversation | MockConversation | null>;
    checkCanMessage: (addresses: string[]) => Promise<Map<string, boolean>>;

    // Group methods
    createGroup: (memberAddresses: string[], options?: GroupOptions) => Promise<Group | MockGroup | null>;
    addGroupMembers: (groupId: string, memberAddresses: string[]) => Promise<boolean>;
    removeGroupMembers: (groupId: string, memberAddresses: string[]) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<boolean>;
    updateGroupInfo: (groupId: string, updates: GroupOptions) => Promise<boolean>;
    getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
    sendGroupMessage: (groupId: string, content: string) => Promise<boolean>;
    getMyGroupRole: (groupId: string) => Promise<{ isAdmin: boolean; isSuperAdmin: boolean; isMember: boolean }>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSecureXMTP(): UseSecureXMTPReturn {
    const { authenticated, user } = usePrivy();
    const { wallets } = useWallets();

    // Use XMTP store instead of local state
    const {
        client,
        isConnecting,
        error,
        connectedAddress,
        setClient,
        setConnecting,
        setError,
        reset
    } = useXMTPStore();

    const streamRef = useRef<AsyncGenerator | null>(null);
    const connectionAttemptedRef = useRef(false);
    const connectionInProgressRef = useRef(false);
    const connectionRetryCount = useRef(0);
    const messageStore = useMessageStore();

    // Get the wallet to use for XMTP
    const getWallet = useCallback(() => {
        if (!wallets || wallets.length === 0) return null;
        const embedded = wallets.find((w) => w.walletClientType === 'privy');
        return embedded || wallets[0];
    }, [wallets]);

    // Helper to restore existing client
    const restoreExistingClient = useCallback(() => {
        const existingClient = getGlobalXMTPClient();
        const wallet = getWallet();
        if (existingClient && connectedAddress === wallet?.address) {
            console.log('[XMTP] Restoring existing client for', wallet?.address);
            setClient(existingClient, wallet?.address);
            return true;
        }
        return false;
    }, [connectedAddress, getWallet, setClient]);

    // ========================================================================
    // CONNECTION METHODS
    // ========================================================================

    const connect = useCallback(async () => {
        // Check if already connected with the same wallet
        if (restoreExistingClient()) {
            return;
        }

        if (!authenticated || client || isConnecting || connectionAttemptedRef.current) return;

        // Prevent concurrent connections - this stops multiple wallet popups
        if (connectionInProgressRef.current) {
            console.log('[XMTP] Connection already in progress, skipping...');
            return;
        }

        connectionInProgressRef.current = true;
        connectionAttemptedRef.current = true;

        const wallet = getWallet();
        if (!wallet) {
            setError('No wallet available');
            connectionInProgressRef.current = false;
            return;
        }

        setConnecting(true);
        setError(null);

        // MOCK MODE
        if (USE_MOCK_XMTP) {
            console.log('[XMTP] MOCK MODE ENABLED - Simulating connection...');
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const mockClient = new MockClient(wallet.address);
                setClient(mockClient, wallet.address);
                setGlobalXMTPClient(mockClient);
                logSecurityEvent('XMTP Mock client connected', { address: wallet.address });
                setConnecting(false);
                connectionInProgressRef.current = false;
                return;
            } catch (e) {
                setError('Mock connection failed');
                setConnecting(false);
                connectionInProgressRef.current = false;
                return;
            }
        }

        // REAL XMTP CONNECTION
        try {
            console.log('[XMTP] Starting connection sequence...');

            // Network diagnostics - test if XMTP endpoints are reachable
            console.log('[XMTP] Running network diagnostics...');
            try {
                // Test dev network gRPC-web endpoint
                const devEndpoint = 'https://grpc.dev.xmtp.network';
                const prodEndpoint = 'https://grpc.xmtp.network';

                // Simple fetch to check if endpoints respond
                const devTest = fetch(devEndpoint, {
                    method: 'HEAD',
                    mode: 'no-cors' // Avoid CORS issues for basic reachability test
                }).then(() => {
                    console.log('[XMTP] Dev endpoint reachable:', devEndpoint);
                    return true;
                }).catch(err => {
                    console.warn('[XMTP] Dev endpoint NOT reachable:', err.message);
                    return false;
                });

                const prodTest = fetch(prodEndpoint, {
                    method: 'HEAD',
                    mode: 'no-cors'
                }).then(() => {
                    console.log('[XMTP] Prod endpoint reachable:', prodEndpoint);
                    return true;
                }).catch(err => {
                    console.warn('[XMTP] Prod endpoint NOT reachable:', err.message);
                    return false;
                });

                const [devReachable, prodReachable] = await Promise.all([devTest, prodTest]);
                console.log('[XMTP] Network diagnostics complete:', { devReachable, prodReachable });

                if (!devReachable && !prodReachable) {
                    console.error('[XMTP] CRITICAL: Neither XMTP endpoint is reachable!');
                    console.error('[XMTP] This may be due to:');
                    console.error('  - Firewall/VPN blocking connections');
                    console.error('  - Browser extension blocking requests');
                    console.error('  - Network connectivity issues');
                }
            } catch (diagErr) {
                console.warn('[XMTP] Network diagnostics error:', diagErr);
            }

            const provider = await wallet.getEthereumProvider();

            // Create signer matching official xmtp.chat implementation
            const signer: Signer = {
                type: 'EOA',
                getIdentifier: () => ({
                    // xmtp.chat uses lowercase address
                    identifier: wallet.address.toLowerCase(),
                    identifierKind: 'Ethereum',
                }),
                signMessage: async (message: string): Promise<Uint8Array> => {
                    console.log('[XMTP] Signing message...');
                    try {
                        const signature = await provider.request({
                            method: 'personal_sign',
                            params: [message, wallet.address],
                        });
                        // Use viem's toBytes like xmtp.chat does
                        return toBytes(signature as `0x${string}`);
                    } catch (signErr) {
                        console.error('[XMTP] Signing failed:', signErr);
                        throw signErr;
                    }
                },
            };

            console.log('[XMTP] Creating Client...');
            console.log('[XMTP] Wallet address:', wallet.address.toLowerCase());
            console.log('[XMTP] Using environment: dev'); // Using dev network
            console.log('[XMTP] Timeout set to:', CONNECTION_TIMEOUT_MS, 'ms');
            console.log('--- XMTP HOOK V2 ACTIVE ---');

            // Load SDK dynamically
            console.log('[XMTP] About to load SDK dynamically...');
            const { Client: SDKClient } = await loadXMTPSDK();
            console.log('[XMTP] SDK module loaded, about to call Client.create...');

            // Create client with dev environment
            const createClient = async () => {
                // NOTE: OPFS persistence is DISABLED due to browser limitations
                // - Browser SDK's SyncAccessHandle Pool VFS doesn't support multiple connections
                // - dbEncryptionKey is ignored in browser environments anyway
                // - Session-unique paths don't help because sessionStorage persists across reloads
                // See: https://docs.xmtp.org/chat-apps/core-messaging/create-a-client

                try {
                    console.log('[XMTP] Calling Client.create() NOW...');
                    console.log('[XMTP] Signer type:', signer.type);
                    console.log('[XMTP] Signer identifier:', signer.getIdentifier());
                    console.log('[XMTP] Using disablePersistence: true (OPFS not supported in browser)');

                    const client = await SDKClient.create(signer, {
                        env: 'dev',
                        appVersion: APP_VERSION,
                        loggingLevel: 'debug',
                        // Disable OPFS persistence - browser SDK has lock conflict issues
                        disablePersistence: true,
                    });
                    console.log('[XMTP] Client.create() succeeded!');
                    return client;
                } catch (sdkErr: unknown) {
                    const error = sdkErr as Error;
                    console.error('[XMTP] SDK Error during Client.create():', error?.message);

                    // Check if this is the installation limit error (V3 specific)
                    if (error?.message?.includes('10/10 installations') ||
                        error?.message?.includes('revoke existing installations')) {
                        console.log('[XMTP] Installation limit reached - revoking old installations...');

                        try {
                            // Create client WITHOUT auto-registering
                            console.log('[XMTP] Creating client with disableAutoRegister...');
                            const clientForRevocation = await SDKClient.create(signer, {
                                env: 'dev',
                                appVersion: APP_VERSION,
                                loggingLevel: 'debug',
                                disablePersistence: true,
                                disableAutoRegister: true,
                            });

                            // Revoke ALL other installations - user will need to sign again
                            console.log('[XMTP] Calling revokeAllOtherInstallations()...');
                            console.log('[XMTP] This will require another signature from your wallet.');
                            await clientForRevocation.revokeAllOtherInstallations();
                            console.log('[XMTP] Old installations revoked!');

                            // Now register this new installation
                            console.log('[XMTP] Registering new installation...');
                            await clientForRevocation.register();
                            console.log('[XMTP] New installation registered successfully!');

                            return clientForRevocation;
                        } catch (revokeErr) {
                            console.error('[XMTP] Failed to revoke installations:', revokeErr);
                            throw new Error('Failed to revoke old installations. Please try again or clear site data.');
                        }
                    }

                    // If OPFS error, suggest clearing storage
                    if (error?.message?.includes('OPFS') || error?.message?.includes('database')) {
                        console.error('[XMTP] Possible OPFS database issue - try clearing site storage');
                    }
                    throw sdkErr;
                }
            };

            const xmtpClient = await Promise.race([
                createClient(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('XMTP connection timeout - please try again')), CONNECTION_TIMEOUT_MS)
                ),
            ]);

            console.log('[XMTP] Client created successfully');
            console.log('[XMTP] Inbox ID:', xmtpClient.inboxId);
            connectionRetryCount.current = 0; // Reset retry count on success

            // Store client globally and in store
            setGlobalXMTPClient(xmtpClient);
            setClient(xmtpClient, wallet.address);
            logSecurityEvent('XMTP V3 client connected', { address: wallet.address });

            // Load existing conversations and start streaming
            await loadConversations(xmtpClient);
            startMessageStream(xmtpClient);

            connectionInProgressRef.current = false;
        } catch (err) {
            console.error('[XMTP] Connection Error:', err);
            const message = err instanceof Error ? err.message : 'Failed to connect';

            // Retry logic
            if (connectionRetryCount.current < MAX_CONNECTION_RETRIES) {
                connectionRetryCount.current++;
                console.log(`[XMTP] Retrying connection (${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES})...`);
                setError(`Connection failed, retrying... (${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES})`);
                connectionAttemptedRef.current = false;
                connectionInProgressRef.current = false;
                setConnecting(false);
                // Wait a bit before retrying
                setTimeout(() => {
                    connect();
                }, 2000);
                return;
            }

            setError(message);
            connectionAttemptedRef.current = false;
            connectionInProgressRef.current = false;
            logSecurityEvent('XMTP connection failed', { error: message, retries: connectionRetryCount.current });
        } finally {
            setConnecting(false);
        }
    }, [authenticated, client, isConnecting, getWallet, connectedAddress, setClient, setConnecting, setError, restoreExistingClient]);

    const disconnect = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.return?.(undefined);
            streamRef.current = null;
        }
        setGlobalXMTPClient(null);
        reset();
        connectionAttemptedRef.current = false;
        logSecurityEvent('XMTP client disconnected');
    }, [reset]);

    const resetConnection = useCallback(() => {
        connectionAttemptedRef.current = false;
        connectionInProgressRef.current = false;
        connectionRetryCount.current = 0;
        setGlobalXMTPClient(null);
        reset();
    }, [reset]);

    // ========================================================================
    // CONVERSATION LOADING
    // ========================================================================

    const loadConversations = async (xmtpClient: Client | MockClient) => {
        if (USE_MOCK_XMTP) return;

        try {
            await xmtpClient.conversations.syncAll();

            // Load both DMs and Groups
            const [dms, groups] = await Promise.all([
                (xmtpClient as Client).conversations.listDms(),
                (xmtpClient as Client).conversations.listGroups(),
            ]);

            console.log('[XMTP] DMs found:', dms.length, 'Groups found:', groups.length);

            // Process DMs
            const dmConversations: StoreConversation[] = await Promise.all(
                dms.map(async (c: any) => {
                    const messages = await c.messages({ limit: BigInt(1) });
                    const lastMsg = messages[0];

                    const peerId = typeof c.peerInboxId === 'function'
                        ? await c.peerInboxId()
                        : (c.peerInboxId || '');

                    return {
                        peerAddress: String(peerId),
                        topic: c.id,
                        type: 'dm' as const,
                        lastMessage: lastMsg ? sanitizeMessage(lastMsg.content as string) : undefined,
                        lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : undefined,
                        unreadCount: 0,
                    };
                })
            );

            // Process Groups
            const groupConversations: StoreConversation[] = await Promise.all(
                groups.map(async (g: any) => {
                    const messages = await g.messages({ limit: BigInt(1) });
                    const lastMsg = messages[0];
                    const members = await g.members();

                    return {
                        peerAddress: '', // Groups don't have a single peer
                        topic: g.id,
                        type: 'group' as const,
                        groupName: g.name || 'Unnamed Group',
                        groupImageUrl: g.imageUrl,
                        memberCount: members.length,
                        lastMessage: lastMsg ? sanitizeMessage(lastMsg.content as string) : undefined,
                        lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : undefined,
                        unreadCount: 0,
                    };
                })
            );

            messageStore.setConversations([...dmConversations, ...groupConversations]);
        } catch (err) {
            console.error('[XMTP] Load conversations error:', err);
        }
    };

    // ========================================================================
    // MESSAGE STREAMING
    // ========================================================================

    const startMessageStream = async (xmtpClient: Client | MockClient) => {
        if (USE_MOCK_XMTP) return;

        try {
            // Use dynamically loaded ConsentState
            const { ConsentState } = await loadXMTPSDK();
            const stream = await (xmtpClient as Client).conversations.streamAllMessages({
                consentStates: [ConsentState.Allowed, ConsentState.Unknown],
            });
            streamRef.current = stream as unknown as AsyncGenerator;

            for await (const message of stream) {
                handleIncomingMessage(message);
            }
        } catch (err) {
            console.error('[XMTP] Stream error:', err);
        }
    };

    const handleIncomingMessage = (message: unknown) => {
        const msg = message as any;
        const storeMessage: StoreMessage = {
            id: msg.id,
            senderAddress: msg.senderInboxId,
            content: sanitizeMessage(String(msg.content || '')),
            timestamp: new Date(Number(msg.sentAtNs) / 1_000_000),
            isSent: msg.senderInboxId === client?.inboxId,
        };

        if (msg.conversationId) {
            messageStore.addMessage(msg.conversationId, storeMessage);
        }
    };

    // ========================================================================
    // DM METHODS
    // ========================================================================

    const checkCanMessage = useCallback(async (addresses: string[]): Promise<Map<string, boolean>> => {
        const identifiers = addresses.map(addr => ({
            identifier: addr,
            identifierKind: 'Ethereum' as const,
        }));

        if (USE_MOCK_XMTP) {
            return MockClient.canMessage(identifiers);
        }

        // Use dynamically loaded Client
        const { Client: SDKClient } = await loadXMTPSDK();
        return SDKClient.canMessage(identifiers, 'dev');
    }, []);

    const startConversation = useCallback(
        async (peerAddress: string): Promise<Conversation | MockConversation | null> => {
            console.log('[XMTP] startConversation called with:', peerAddress);

            if (!client) {
                console.log('[XMTP] startConversation failed: no client');
                setError('Not connected to XMTP');
                return null;
            }

            if (!validateAddress(peerAddress)) {
                console.log('[XMTP] startConversation failed: invalid address');
                setError('Invalid address');
                return null;
            }

            try {
                // Check if can message
                console.log('[XMTP] Checking canMessage for:', peerAddress);
                const canMessageResult = await checkCanMessage([peerAddress]);
                console.log('[XMTP] canMessage result:', canMessageResult);
                console.log('[XMTP] canMessage for', peerAddress.toLowerCase(), ':', canMessageResult.get(peerAddress.toLowerCase()));

                if (!canMessageResult.get(peerAddress.toLowerCase())) {
                    console.log('[XMTP] Peer is NOT on XMTP network');
                    setError('This address is not on XMTP. They need to enable XMTP first.');
                    return null;
                }

                // V3 API: Resolve address to inbox ID before creating DM
                console.log('[XMTP] Resolving address to inbox ID...');
                const peerInboxId = await getInboxIdFromAddress(client as Client, peerAddress);

                if (!peerInboxId) {
                    console.log('[XMTP] Failed to resolve inbox ID for address:', peerAddress);
                    setError('Could not resolve inbox ID for this address');
                    return null;
                }

                console.log('[XMTP] Resolved inbox ID:', peerInboxId);

                // Create or get existing DM using inbox ID
                console.log('[XMTP] Creating DM with inbox ID:', peerInboxId);
                const dm = await (client as Client).conversations.newDm(peerInboxId);
                console.log('[XMTP] DM created:', dm.id);

                // Add to store
                messageStore.addConversation({
                    peerAddress: peerAddress,
                    topic: dm.id,
                    type: 'dm',
                    unreadCount: 0,
                });

                logSecurityEvent('DM conversation started', { peerAddress });
                return dm as Conversation | MockConversation;
            } catch (err) {
                console.error('[XMTP] Start conversation error:', err);
                console.error('[XMTP] Error details:', {
                    name: (err as Error).name,
                    message: (err as Error).message,
                    stack: (err as Error).stack,
                });
                setError(err instanceof Error ? err.message : 'Failed to start conversation');
                return null;
            }
        },
        [client, messageStore, checkCanMessage]
    );

    const sendMessage = useCallback(
        async (peerAddress: string, content: string): Promise<boolean> => {
            if (!client) {
                setError('Not connected to XMTP');
                return false;
            }

            if (!validateAddress(peerAddress)) {
                setError('Invalid recipient address');
                return false;
            }

            const sanitized = sanitizeMessage(content);
            if (!sanitized) {
                setError('Message cannot be empty');
                return false;
            }

            // MOCK SEND
            if (USE_MOCK_XMTP) {
                await new Promise(r => setTimeout(r, 500));
                const mockTopic = `mock-dm-${peerAddress}`;

                let exists = messageStore.conversations.find(c => c.peerAddress === peerAddress);
                if (!exists) {
                    messageStore.addConversation({
                        peerAddress,
                        topic: mockTopic,
                        type: 'dm',
                        unreadCount: 0,
                    });
                }

                messageStore.addMessage(exists ? exists.topic : mockTopic, {
                    id: Date.now().toString(),
                    senderAddress: client.inboxId || '',
                    content: sanitized,
                    timestamp: new Date(),
                    isSent: true,
                });

                return true;
            }

            // REAL SEND
            try {
                // V3 API: Resolve address to inbox ID
                const peerInboxId = await getInboxIdFromAddress(client as Client, peerAddress);

                if (!peerInboxId) {
                    setError('Could not resolve inbox ID for this address');
                    return false;
                }

                const dms = await (client as Client).conversations.listDms();
                let conversation = dms.find((dm: any) => String(dm.peerInboxId) === peerInboxId);

                if (!conversation) {
                    const canMessage = await checkCanMessage([peerAddress]);
                    if (!canMessage.get(peerAddress.toLowerCase())) {
                        setError('This address is not on XMTP');
                        return false;
                    }
                    // Use inbox ID to create new DM
                    conversation = await (client as Client).conversations.newDm(peerInboxId);
                }

                await conversation.send(sanitized);
                return true;
            } catch (err) {
                console.error('[XMTP] Send message error:', err);
                const message = err instanceof Error ? err.message : 'Failed to send';
                setError(message);
                return false;
            }
        },
        [client, user, messageStore, checkCanMessage]
    );

    // ========================================================================
    // GROUP METHODS
    // ========================================================================

    const createGroup = useCallback(
        async (memberAddresses: string[], options?: GroupOptions): Promise<Group | MockGroup | null> => {
            if (!client) {
                setError('Not connected to XMTP');
                return null;
            }

            // Validate all addresses
            const invalidAddresses = memberAddresses.filter(addr => !validateAddress(addr));
            if (invalidAddresses.length > 0) {
                setError(`Invalid addresses: ${invalidAddresses.join(', ')}`);
                return null;
            }

            try {
                // Check which addresses can receive messages
                const canMessageResult = await checkCanMessage(memberAddresses);
                const unreachable = memberAddresses.filter(
                    addr => !canMessageResult.get(addr.toLowerCase())
                );

                if (unreachable.length > 0) {
                    setError(`These addresses are not on XMTP: ${unreachable.join(', ')}`);
                    return null;
                }

                // MOCK CREATE
                if (USE_MOCK_XMTP) {
                    await new Promise(r => setTimeout(r, 500));
                    const group = await (client as MockClient).conversations.newGroup(memberAddresses, options);

                    messageStore.addConversation({
                        peerAddress: '',
                        topic: group.id,
                        type: 'group',
                        groupName: options?.name || 'New Group',
                        groupImageUrl: options?.imageUrl,
                        memberCount: memberAddresses.length + 1, // +1 for self
                        unreadCount: 0,
                    });

                    logSecurityEvent('Group created (mock)', { memberCount: memberAddresses.length });
                    return group;
                }

                // REAL CREATE - Cast options to any since SDK types may be outdated
                const groupOptions: any = {
                    name: options?.name,
                    imageUrl: options?.imageUrl,
                    description: options?.description,
                };

                // V3 API: Resolve all member addresses to inbox IDs
                console.log('[XMTP] Resolving member addresses to inbox IDs...');
                const inboxIds: string[] = [];

                for (const address of memberAddresses) {
                    const inboxId = await getInboxIdFromAddress(client as Client, address);
                    if (inboxId) {
                        inboxIds.push(inboxId);
                        console.log('[XMTP] Resolved', address, 'to inbox ID:', inboxId);
                    } else {
                        console.warn('[XMTP] Could not resolve inbox ID for:', address);
                    }
                }

                if (inboxIds.length === 0) {
                    setError('Could not resolve any member inbox IDs');
                    return null;
                }

                if (inboxIds.length < memberAddresses.length) {
                    console.warn('[XMTP] Warning: Some addresses could not be resolved to inbox IDs');
                    console.warn('[XMTP] Proceeding with', inboxIds.length, 'out of', memberAddresses.length, 'members');
                }

                // Create group with inbox IDs
                console.log('[XMTP] Creating group with', inboxIds.length, 'inbox IDs');
                const group = await (client as Client).conversations.newGroup(inboxIds, groupOptions);

                messageStore.addConversation({
                    peerAddress: '',
                    topic: group.id,
                    type: 'group',
                    groupName: options?.name || 'New Group',
                    groupImageUrl: options?.imageUrl,
                    memberCount: inboxIds.length + 1,
                    unreadCount: 0,
                });

                logSecurityEvent('Group created', { memberCount: inboxIds.length });
                return group;
            } catch (err) {
                console.error('[XMTP] Create group error:', err);
                setError(err instanceof Error ? err.message : 'Failed to create group');
                return null;
            }
        },
        [client, checkCanMessage, messageStore]
    );

    const addGroupMembers = useCallback(
        async (groupId: string, memberAddresses: string[]): Promise<boolean> => {
            if (!client) return false;

            try {
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation || !('addMembers' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                await (conversation as any).addMembers(memberAddresses);
                logSecurityEvent('Group members added', { groupId, count: memberAddresses.length });
                return true;
            } catch (err) {
                console.error('[XMTP] Add group members error:', err);
                setError(err instanceof Error ? err.message : 'Failed to add members');
                return false;
            }
        },
        [client]
    );

    const removeGroupMembers = useCallback(
        async (groupId: string, memberAddresses: string[]): Promise<boolean> => {
            if (!client) return false;

            try {
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation || !('removeMembers' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                await (conversation as any).removeMembers(memberAddresses);
                logSecurityEvent('Group members removed', { groupId, count: memberAddresses.length });
                return true;
            } catch (err) {
                console.error('[XMTP] Remove group members error:', err);
                setError(err instanceof Error ? err.message : 'Failed to remove members');
                return false;
            }
        },
        [client]
    );

    const leaveGroup = useCallback(
        async (groupId: string): Promise<boolean> => {
            if (!client) return false;

            try {
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation || !('leaveGroup' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                await (conversation as any).leaveGroup();
                logSecurityEvent('Left group', { groupId });
                return true;
            } catch (err) {
                console.error('[XMTP] Leave group error:', err);
                setError(err instanceof Error ? err.message : 'Failed to leave group');
                return false;
            }
        },
        [client]
    );

    const updateGroupInfo = useCallback(
        async (groupId: string, updates: GroupOptions): Promise<boolean> => {
            // Handle mock mode
            if (USE_MOCK_XMTP) {
                console.log('[XMTP Mock] Updating group info:', { groupId, updates });
                // Update local store
                const { conversations, setConversations } = useMessageStore.getState();
                const updated = conversations.map(c => {
                    if (c.topic === groupId) {
                        return {
                            ...c,
                            groupName: updates.name || c.groupName,
                            groupImageUrl: updates.imageUrl || c.groupImageUrl,
                        };
                    }
                    return c;
                });
                setConversations(updated);
                return true;
            }

            if (!client) {
                setError('Not connected to XMTP');
                return false;
            }

            try {
                console.log('[XMTP] Updating group info:', { groupId, updates });

                // Sync all conversations first to ensure we have the latest state
                console.log('[XMTP] Syncing all conversations...');
                await (client as Client).conversations.syncAll();

                // Get the group
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation) {
                    console.error('[XMTP] Group not found with ID:', groupId);
                    setError('Group not found');
                    return false;
                }

                console.log('[XMTP] Found conversation, checking type...');
                const group = conversation as any;

                // Check if it's actually a group (not a DM)
                if (!('updateName' in group)) {
                    console.error('[XMTP] Conversation is not a group');
                    setError('This is not a group conversation');
                    return false;
                }

                // Sync the group specifically
                if ('sync' in group) {
                    console.log('[XMTP] Syncing group...');
                    await group.sync();
                }

                // Check if user has permission by getting members and checking admin status
                if ('members' in group) {
                    const members = await group.members();
                    const currentMember = members.find(
                        (m: any) => m.inboxId === (client as Client).inboxId
                    );

                    console.log('[XMTP] Current user member info:', {
                        found: !!currentMember,
                        isAdmin: currentMember?.isAdmin,
                        isSuperAdmin: currentMember?.isSuperAdmin,
                        inboxId: (client as Client).inboxId
                    });

                    // Note: According to XMTP default policy, all members can update metadata
                    // But if custom permissions are set, we should check
                    if (currentMember && !currentMember.isAdmin && !currentMember.isSuperAdmin) {
                        console.log('[XMTP] User is not admin, but trying update (default policy allows all members)');
                    }
                }

                // Perform updates
                let updateSuccess = true;

                if (updates.name) {
                    console.log('[XMTP] Updating group name to:', updates.name);
                    try {
                        await group.updateName(updates.name);
                        console.log('[XMTP] Group name updated successfully');
                    } catch (nameErr) {
                        console.error('[XMTP] Failed to update name:', nameErr);
                        updateSuccess = false;
                        throw nameErr;
                    }
                }

                if (updates.imageUrl) {
                    console.log('[XMTP] Updating group image...');
                    try {
                        await group.updateImageUrl(updates.imageUrl);
                        console.log('[XMTP] Group image updated successfully');
                    } catch (imgErr) {
                        console.error('[XMTP] Failed to update image:', imgErr);
                        updateSuccess = false;
                        throw imgErr;
                    }
                }

                if (updates.description && 'updateDescription' in group) {
                    console.log('[XMTP] Updating group description...');
                    try {
                        await group.updateDescription(updates.description);
                        console.log('[XMTP] Group description updated successfully');
                    } catch (descErr) {
                        console.error('[XMTP] Failed to update description:', descErr);
                        // Don't fail completely for description
                    }
                }

                // Sync again after update to propagate changes
                if ('sync' in group) {
                    console.log('[XMTP] Final sync after updates...');
                    await group.sync();
                }

                if (updateSuccess) {
                    // Update local store
                    const { conversations, setConversations } = useMessageStore.getState();
                    const updatedConversations = conversations.map(c => {
                        if (c.topic === groupId) {
                            return {
                                ...c,
                                groupName: updates.name || c.groupName,
                                groupImageUrl: updates.imageUrl || c.groupImageUrl,
                            };
                        }
                        return c;
                    });
                    setConversations(updatedConversations);

                    logSecurityEvent('Group info updated', { groupId });
                    return true;
                }

                return false;
            } catch (err) {
                console.error('[XMTP] Update group info error:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to update group';

                // Check for permission-related errors
                if (errorMessage.toLowerCase().includes('permission') ||
                    errorMessage.toLowerCase().includes('unauthorized') ||
                    errorMessage.toLowerCase().includes('not allowed')) {
                    setError('You do not have permission to edit this group. Only admins can modify group info.');
                } else {
                    setError(errorMessage);
                }
                return false;
            }
        },
        [client]
    );


    const getGroupMembers = useCallback(
        async (groupId: string): Promise<GroupMember[]> => {
            if (!client) return [];

            try {
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation || !('members' in conversation)) {
                    return [];
                }

                const members = await (conversation as any).members();
                return members.map((m: any) => ({
                    inboxId: m.inboxId,
                    address: m.accountIdentity?.identifier || m.inboxId,
                    isAdmin: m.isAdmin || false,
                    isSuperAdmin: m.isSuperAdmin || false,
                }));
            } catch (err) {
                console.error('[XMTP] Get group members error:', err);
                return [];
            }
        },
        [client]
    );

    const sendGroupMessage = useCallback(
        async (groupId: string, content: string): Promise<boolean> => {
            if (!client) {
                setError('Not connected to XMTP');
                return false;
            }

            const sanitized = sanitizeMessage(content);
            if (!sanitized) {
                setError('Message cannot be empty');
                return false;
            }

            try {
                const conversation = await client.conversations.getConversationById(groupId);
                if (!conversation) {
                    setError('Group not found');
                    return false;
                }

                // MOCK SEND
                if (USE_MOCK_XMTP) {
                    await new Promise(r => setTimeout(r, 300));
                    messageStore.addMessage(groupId, {
                        id: Date.now().toString(),
                        senderAddress: client.inboxId || '',
                        content: sanitized,
                        timestamp: new Date(),
                        isSent: true,
                    });
                    return true;
                }

                // REAL SEND
                await (conversation as any).send(sanitized);
                return true;
            } catch (err) {
                console.error('[XMTP] Send group message error:', err);
                setError(err instanceof Error ? err.message : 'Failed to send');
                return false;
            }
        },
        [client, messageStore]
    );

    // Get current user's role in a group
    const getMyGroupRole = useCallback(
        async (groupId: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean; isMember: boolean }> => {
            const defaultRole = { isAdmin: false, isSuperAdmin: false, isMember: false };

            if (USE_MOCK_XMTP) {
                return { isAdmin: true, isSuperAdmin: true, isMember: true };
            }

            if (!client) return defaultRole;

            try {
                await (client as Client).conversations.syncAll();
                const conversation = await client.conversations.getConversationById(groupId);

                if (!conversation || !('members' in conversation)) {
                    return defaultRole;
                }

                const members = await (conversation as any).members();
                const currentMember = members.find(
                    (m: any) => m.inboxId === (client as Client).inboxId
                );

                if (!currentMember) {
                    return defaultRole;
                }

                return {
                    isAdmin: currentMember.isAdmin || false,
                    isSuperAdmin: currentMember.isSuperAdmin || false,
                    isMember: true,
                };
            } catch (err) {
                console.error('[XMTP] Get my group role error:', err);
                return defaultRole;
            }
        },
        [client]
    );

    // ========================================================================
    // AUTO-CONNECT EFFECT
    // ========================================================================

    useEffect(() => {
        // Skip if already connected or connecting
        if (client || isConnecting) return;

        // Skip if not authenticated or no wallets
        if (!authenticated || !wallets || wallets.length === 0) return;

        // Try to restore existing client
        if (restoreExistingClient()) {
            return;
        }

        // Only auto-connect if we don't have a connection attempt in progress
        if (!connectionAttemptedRef.current) {
            console.log('[XMTP] Auto-connecting...');
            connect();
        }
    }, [authenticated, wallets, client, isConnecting, connect, restoreExistingClient]);

    // Handle page visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !client) {
                // User returned to tab - try to restore client
                restoreExistingClient();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [client, restoreExistingClient]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.return?.(undefined);
            }
        };
    }, []);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        client,
        isConnecting,
        isConnected: !!client,
        error,
        connect,
        disconnect,
        resetConnection,
        sendMessage,
        startConversation,
        checkCanMessage,
        createGroup,
        addGroupMembers,
        removeGroupMembers,
        leaveGroup,
        updateGroupInfo,
        getGroupMembers,
        sendGroupMessage,
        getMyGroupRole,
    };
}
