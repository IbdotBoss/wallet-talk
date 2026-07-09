/**
 * useSecureXMTP - XMTP V3 client hook with Privy integration
 *
 * Uses @xmtp/browser-sdk (V3) with proper signer format.
 * Supports both DM and Group conversations.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// Dynamic import - SDK loaded only when needed to prevent WASM blocking React mount.
// Value imports (classes/enums) are re-exported from @xmtp/wasm-bindings, so importing
// any of them eagerly at module scope would force-load the WASM binary on app boot.
// Only type-only imports are safe to use statically; everything else goes through
// loadXMTPSDK() below.
import type {
    Client,
    Signer,
    Conversation,
    Group,
    Dm,
    Identifier,
    ConsentState,
    CreateGroupOptions,
    InboxState,
} from '@xmtp/browser-sdk';
import { toBytes } from 'viem'; // Use viem's toBytes like official xmtp.chat
import { useMessageStore, type Message as StoreMessage, type Conversation as StoreConversation } from '@/store/messageStore';
import { sanitizeMessage, validateAddress, logSecurityEvent } from '@/lib/SecurityService';
import { useXMTPStore, getGlobalXMTPClient, setGlobalXMTPClient } from '@/store/xmtpStore';
import { XMTP_ENV } from '@/lib/xmtpConfig';

// App version for XMTP analytics (recommended by XMTP docs)
const APP_VERSION = 'wallet-talk/1.0.0';

// Connection timeout in milliseconds (increased for slow connections)
const CONNECTION_TIMEOUT_MS = 60000; // 60 seconds

// Max retry attempts for connection
const MAX_CONNECTION_RETRIES = 3;

// SDK module references - populated on first connect via dynamic import
let XMTPClient: typeof import('@xmtp/browser-sdk').Client | null = null;
let XMTPConsentState: typeof import('@xmtp/browser-sdk').ConsentState | null = null;
let XMTPConsentEntityType: typeof import('@xmtp/browser-sdk').ConsentEntityType | null = null;
let XMTPIdentifierKind: typeof import('@xmtp/browser-sdk').IdentifierKind | null = null;
let XMTPPermissionLevel: typeof import('@xmtp/browser-sdk').PermissionLevel | null = null;
let XMTPSortDirection: typeof import('@xmtp/browser-sdk').SortDirection | null = null;

// Helper to load SDK dynamically
async function loadXMTPSDK() {
    if (
        !XMTPClient ||
        !XMTPConsentState ||
        !XMTPConsentEntityType ||
        !XMTPIdentifierKind ||
        !XMTPPermissionLevel ||
        !XMTPSortDirection
    ) {
        console.log('[XMTP] Loading browser SDK dynamically...');
        const sdk = await import('@xmtp/browser-sdk');
        XMTPClient = sdk.Client;
        XMTPConsentState = sdk.ConsentState;
        XMTPConsentEntityType = sdk.ConsentEntityType;
        XMTPIdentifierKind = sdk.IdentifierKind;
        XMTPPermissionLevel = sdk.PermissionLevel;
        XMTPSortDirection = sdk.SortDirection;
        console.log('[XMTP] SDK loaded successfully');
    }
    return {
        Client: XMTPClient,
        ConsentState: XMTPConsentState,
        ConsentEntityType: XMTPConsentEntityType,
        IdentifierKind: XMTPIdentifierKind,
        PermissionLevel: XMTPPermissionLevel,
        SortDirection: XMTPSortDirection,
    };
}

// Helper to resolve Ethereum address to inbox ID using XMTP V3 API
const getInboxIdFromAddress = async (client: Client, address: string): Promise<string | null> => {
    try {
        const { IdentifierKind } = await loadXMTPSDK();
        const inboxId = await client.fetchInboxIdByIdentifier({
            identifier: address.toLowerCase(),
            identifierKind: IdentifierKind.Ethereum,
        });
        return inboxId || null;
    } catch (err) {
        console.error('[XMTP] Failed to get inbox ID for address:', address, err);
        return null;
    }
};

// Helper to batch-resolve inbox IDs to their Ethereum addresses.
// Falls back to the local (unsynced) inbox state if the network call fails,
// and leaves an address as '' when it can't be resolved either way.
const resolveInboxAddresses = async (
    client: Client,
    inboxIds: string[]
): Promise<Map<string, string>> => {
    const result = new Map<string, string>();
    if (inboxIds.length === 0) return result;

    try {
        const { IdentifierKind } = await loadXMTPSDK();

        let inboxStates: InboxState[];
        try {
            inboxStates = await client.preferences.fetchInboxStates(inboxIds);
        } catch (err) {
            console.warn('[XMTP] fetchInboxStates failed, falling back to local getInboxStates:', err);
            inboxStates = await client.preferences.getInboxStates(inboxIds);
        }

        for (const state of inboxStates) {
            const ethIdentifier = state.accountIdentifiers.find(
                (i) => i.identifierKind === IdentifierKind.Ethereum
            );
            result.set(state.inboxId, ethIdentifier ? ethIdentifier.identifier.toLowerCase() : '');
        }
    } catch (err) {
        console.error('[XMTP] Failed to resolve inbox addresses:', err);
    }

    return result;
};

// Maps the SDK's ConsentState enum value to the store's string union.
// Takes the already-loaded ConsentState enum object (via loadXMTPSDK) rather
// than loading it itself, since callers already have it in scope.
function mapConsent(
    state: ConsentState,
    ConsentStateEnum: typeof import('@xmtp/browser-sdk').ConsentState
): 'allowed' | 'denied' | 'unknown' {
    if (state === ConsentStateEnum.Allowed) return 'allowed';
    if (state === ConsentStateEnum.Denied) return 'denied';
    return 'unknown';
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
    client: Client | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;

    // Core methods
    connect: () => Promise<void>;
    disconnect: () => void;
    resetConnection: () => void;

    // DM methods
    sendMessage: (peerAddress: string, content: string) => Promise<boolean>;
    startConversation: (peerAddress: string) => Promise<Conversation | null>;
    checkCanMessage: (addresses: string[]) => Promise<Map<string, boolean>>;
    loadMessageHistory: (conversationId: string) => Promise<void>;

    // Group methods
    createGroup: (memberAddresses: string[], options?: GroupOptions) => Promise<Group | null>;
    addGroupMembers: (groupId: string, memberAddresses: string[]) => Promise<boolean>;
    removeGroupMembers: (groupId: string, memberAddresses: string[]) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<boolean>;
    updateGroupInfo: (groupId: string, updates: GroupOptions) => Promise<boolean>;
    getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
    sendGroupMessage: (groupId: string, content: string) => Promise<boolean>;
    getMyGroupRole: (groupId: string) => Promise<{ isAdmin: boolean; isSuperAdmin: boolean; isMember: boolean }>;

    // Consent management methods
    setConversationConsent: (conversationId: string, state: 'allowed' | 'denied') => Promise<boolean>;
    setInboxIdConsent: (inboxId: string, state: 'allowed' | 'denied') => Promise<boolean>;
    getConversationConsent: (conversationId: string) => Promise<'allowed' | 'denied' | 'unknown' | null>;
    loadMessageRequests: () => Promise<Array<{ conversation: Conversation | Group; type: 'dm' | 'group' }>>;
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

        try {
            console.log('[XMTP] Starting connection sequence...');

            const provider = await wallet.getEthereumProvider();

            // Load SDK dynamically before building the signer (it needs IdentifierKind)
            console.log('[XMTP] About to load SDK dynamically...');
            const { Client: SDKClient, IdentifierKind } = await loadXMTPSDK();
            console.log('[XMTP] SDK module loaded, about to call Client.create...');

            // Create signer matching official xmtp.chat implementation
            const signer: Signer = {
                type: 'EOA',
                getIdentifier: (): Identifier => ({
                    // xmtp.chat uses lowercase address
                    identifier: wallet.address.toLowerCase(),
                    identifierKind: IdentifierKind.Ethereum,
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
            console.log('[XMTP] Using environment:', XMTP_ENV);
            console.log('[XMTP] Timeout set to:', CONNECTION_TIMEOUT_MS, 'ms');
            console.log('--- XMTP HOOK V2 ACTIVE ---');

            const createClient = async () => {
                // Persist the local database in OPFS, keyed per wallet address, so
                // returning users don't need to re-sync their full history from
                // scratch on every page load.
                try {
                    console.log('[XMTP] Calling Client.create() NOW...');
                    console.log('[XMTP] Signer type:', signer.type);
                    console.log('[XMTP] Signer identifier:', signer.getIdentifier());

                    const dbPath = `xmtp-${wallet.address.toLowerCase()}.db`;
                    console.log('[XMTP] Using dbPath:', dbPath);

                    const client = await SDKClient.create(signer, {
                        env: XMTP_ENV,
                        appVersion: APP_VERSION,
                        // Enable persistence for offline support and faster loads
                        dbPath: dbPath,
                    });
                    console.log('[XMTP] Client.create() succeeded!');
                    return client;
                } catch (sdkErr: unknown) {
                    const error = sdkErr as Error;
                    console.error('[XMTP] SDK Error during Client.create():', error?.message);

                    // Check if this is the installation limit error (V3 specific)
                    if (error?.message?.includes('10/10 installations') ||
                        error?.message?.includes('revoke existing installations')) {
                        console.error('[XMTP] Installation limit reached.');
                        // Do NOT auto-revoke. Inform user.
                        throw new Error('XMTP installation limit reached. Please manage your installations via a compatible dashboard or sign out of other sessions.');
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

    const loadConversations = async (xmtpClient: Client) => {
        try {
            // Sync with both Allowed and Unknown consent so message requests show up too
            const { ConsentState } = await loadXMTPSDK();
            await xmtpClient.conversations.syncAll([ConsentState.Allowed, ConsentState.Unknown]);

            // Load both DMs and Groups
            const [dms, groups] = await Promise.all([
                xmtpClient.conversations.listDms(),
                xmtpClient.conversations.listGroups(),
            ]);

            console.log('[XMTP] DMs found:', dms.length, 'Groups found:', groups.length);

            // Resolve every DM's peer inbox ID, then batch-resolve all of them to
            // Ethereum addresses in a single call.
            const peerInboxIds = await Promise.all(dms.map((dm) => dm.peerInboxId()));
            const uniqueInboxIds = Array.from(new Set(peerInboxIds));
            const addressByInboxId = await resolveInboxAddresses(xmtpClient, uniqueInboxIds);

            // Process DMs
            const dmConversations: StoreConversation[] = await Promise.all(
                dms.map(async (dm, index) => {
                    const messages = await dm.messages({ limit: BigInt(1) });
                    const lastMsg = messages[0];
                    const peerInboxId = peerInboxIds[index];

                    return {
                        peerAddress: addressByInboxId.get(peerInboxId) ?? '',
                        peerInboxId,
                        topic: dm.id,
                        type: 'dm' as const,
                        consentState: mapConsent(await dm.consentState(), ConsentState),
                        lastMessage: lastMsg ? sanitizeMessage(getMessageText(lastMsg.content)) : undefined,
                        lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : undefined,
                        unreadCount: 0,
                    };
                })
            );

            // Process Groups
            const groupConversations: StoreConversation[] = await Promise.all(
                groups.map(async (g) => {
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
                        consentState: mapConsent(await g.consentState(), ConsentState),
                        lastMessage: lastMsg ? sanitizeMessage(getMessageText(lastMsg.content)) : undefined,
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

    const startMessageStream = async (xmtpClient: Client) => {
        try {
            // Use dynamically loaded ConsentState
            const { ConsentState } = await loadXMTPSDK();

            // Stream with proper callbacks. Include Unknown so brand-new inbound
            // conversations (message requests) show up live without a manual refresh.
            const stream = await xmtpClient.conversations.streamAllMessages({
                consentStates: [ConsentState.Allowed, ConsentState.Unknown],
                retryAttempts: 10,
                retryDelay: 20000, // 20 seconds between retries
                onError: (error: Error) => {
                    console.error('[XMTP] Stream error:', error);
                },
                onFail: () => {
                    console.error('[XMTP] Stream failed after all retry attempts');
                },
                onRetry: (attempt: number, maxAttempts: number) => {
                    console.log(`[XMTP] Stream retry attempt ${attempt} of ${maxAttempts}`);
                },
                onRestart: () => {
                    console.log('[XMTP] Stream restarted successfully');
                },
            });
            streamRef.current = stream as unknown as AsyncGenerator;

            for await (const message of stream) {
                handleIncomingMessage(message);
            }
        } catch (err) {
            console.error('[XMTP] Stream initialization error:', err);
        }
    };

    // Helper to extract text content from XMTP V3 message content
    const getMessageText = (content: unknown): string => {
        if (typeof content === 'string') {
            return content;
        }
        if (content && typeof content === 'object') {
            // XMTP V3 text content type
            if ('text' in content) return String((content as any).text);
            if ('content' in content) return String((content as any).content);
            // Skip non-text content types (reactions, receipts, system messages, etc.)
            if ('type' in content) {
                const type = (content as any).type;
                if (type !== 'text' && type !== 'string') {
                    return ''; // Skip system messages
                }
            }
        }
        return '';
    };

    // When a message arrives for a conversation we don't have locally yet (e.g. a
    // brand-new inbound DM or group invite), fetch and add it to the store so it
    // shows up live - typically in the Requests tab, since its consent is Unknown.
    const addNewConversationFromMessage = async (conversationId: string) => {
        try {
            const xmtpClient = getGlobalXMTPClient() as Client | null;
            if (!xmtpClient) return;

            const conv = await xmtpClient.conversations.getConversationById(conversationId);
            if (!conv) return;

            // Re-check in case another in-flight call already added it
            if (useMessageStore.getState().conversations.some((c) => c.topic === conversationId)) {
                return;
            }

            const { ConsentState } = await loadXMTPSDK();
            const consentState = mapConsent(await conv.consentState(), ConsentState);
            const isDm = typeof (conv as Dm).peerInboxId === 'function';

            if (isDm) {
                const dm = conv as Dm;
                const peerInboxId = await dm.peerInboxId();
                const addressByInboxId = await resolveInboxAddresses(xmtpClient, [peerInboxId]);

                messageStore.addConversation({
                    peerAddress: addressByInboxId.get(peerInboxId) ?? '',
                    peerInboxId,
                    topic: dm.id,
                    type: 'dm',
                    unreadCount: 0,
                    consentState,
                });
            } else {
                const group = conv as Group;
                const members = await group.members();

                messageStore.addConversation({
                    peerAddress: '',
                    topic: group.id,
                    type: 'group',
                    groupName: group.name || 'Unnamed Group',
                    groupImageUrl: group.imageUrl,
                    memberCount: members.length,
                    unreadCount: 0,
                    consentState,
                });
            }
        } catch (err) {
            console.error('[XMTP] Failed to add new conversation from incoming message:', err);
        }
    };

    const handleIncomingMessage = (message: unknown) => {
        const msg = message as any;

        // Extract text content properly
        const textContent = getMessageText(msg.content);

        // Skip non-text messages (system messages, reactions, etc.)
        if (!textContent) {
            console.log('[XMTP] Skipping non-text message:', msg.contentType || 'unknown');
            return;
        }

        // Get current client from global store (not stale closure)
        const currentClient = getGlobalXMTPClient();
        const myInboxId = currentClient?.inboxId?.toLowerCase() || '';
        const senderInboxId = (msg.senderInboxId || '').toLowerCase();

        // Debug logging
        console.log('[XMTP] Message received:', {
            senderInboxId,
            myInboxId,
            isSent: senderInboxId === myInboxId,
        });

        const conversationId = msg.conversationId;
        const isSentByMe = senderInboxId === myInboxId;

        // If this message belongs to a conversation we don't know about yet, add it
        // (fire-and-forget so we don't block message handling on a network round-trip).
        if (conversationId && !useMessageStore.getState().conversations.some((c) => c.topic === conversationId)) {
            void addNewConversationFromMessage(conversationId);
        }

        // RECONCILIATION LOGIC
        if (isSentByMe && conversationId) {
            const { messages, replaceMessage } = useMessageStore.getState();
            const conversationMessages = messages.get(conversationId) || [];

            // Find a pending message with same content
            // We look for messages starting with 'pending-' that match content
            const pendingMatch = conversationMessages.find(m =>
                m.id.startsWith('pending-') &&
                m.content === sanitizeMessage(textContent)
            );

            if (pendingMatch) {
                console.log('[XMTP] Reconciling optimistic message:', pendingMatch.id, '->', msg.id);
                replaceMessage(conversationId, pendingMatch.id, {
                    id: msg.id,
                    senderAddress: msg.senderInboxId,
                    content: sanitizeMessage(textContent),
                    timestamp: new Date(Number(msg.sentAtNs) / 1_000_000),
                    isSent: true,
                });
                return; // Done reconciling
            }
        }

        const storeMessage: StoreMessage = {
            id: msg.id,
            senderAddress: msg.senderInboxId,
            content: sanitizeMessage(textContent),
            timestamp: new Date(Number(msg.sentAtNs) / 1_000_000),
            isSent: isSentByMe, // Normalized comparison
        };

        if (conversationId) {
            messageStore.addMessage(conversationId, storeMessage);
        }
    };

    // ========================================================================
    // DM METHODS
    // ========================================================================

    const checkCanMessage = useCallback(async (addresses: string[]): Promise<Map<string, boolean>> => {
        const { Client: SDKClient, IdentifierKind } = await loadXMTPSDK();
        const identifiers: Identifier[] = addresses.map(addr => ({
            identifier: addr,
            identifierKind: IdentifierKind.Ethereum,
        }));

        return SDKClient.canMessage(identifiers, XMTP_ENV);
    }, []);

    const startConversation = useCallback(
        async (peerAddress: string): Promise<Conversation | null> => {
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
                const peerInboxId = await getInboxIdFromAddress(client, peerAddress);

                if (!peerInboxId) {
                    console.log('[XMTP] Failed to resolve inbox ID for address:', peerAddress);
                    setError('Could not resolve inbox ID for this address');
                    return null;
                }

                console.log('[XMTP] Resolved inbox ID:', peerInboxId);

                // Create or get existing DM using inbox ID
                console.log('[XMTP] Creating DM with inbox ID:', peerInboxId);
                const dm = await client.conversations.createDm(peerInboxId);
                console.log('[XMTP] DM created:', dm.id);

                // Add to store
                messageStore.addConversation({
                    peerAddress: peerAddress,
                    peerInboxId,
                    topic: dm.id,
                    type: 'dm',
                    unreadCount: 0,
                    consentState: 'allowed',
                });

                logSecurityEvent('DM conversation started', { peerAddress });
                return dm;
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

            try {
                // V3 API: Resolve address to inbox ID
                const peerInboxId = await getInboxIdFromAddress(client, peerAddress);

                if (!peerInboxId) {
                    setError('Could not resolve inbox ID for this address');
                    return false;
                }

                let conversation = await client.conversations.getDmByInboxId(peerInboxId);

                if (!conversation) {
                    const canMessage = await checkCanMessage([peerAddress]);
                    if (!canMessage.get(peerAddress.toLowerCase())) {
                        setError('This address is not on XMTP');
                        return false;
                    }
                    // Use inbox ID to create new DM with SDK v6 API
                    conversation = await client.conversations.createDm(peerInboxId);
                }

                // Optimistic update - add to store immediately for instant UI feedback
                const optimisticMessageId = `pending-${crypto.randomUUID()}`;
                const optimisticMessage: StoreMessage = {
                    id: optimisticMessageId,
                    senderAddress: client.inboxId || '',
                    content: sanitized,
                    timestamp: new Date(),
                    isSent: true, // Always true for messages we send
                };

                // Add optimistic message to the store
                messageStore.addMessage(conversation.id, optimisticMessage);
                console.log('[XMTP] Added optimistic message to UI');

                // Actually send the message using sendText per SDK v6 API
                await conversation.sendText(sanitized);
                console.log('[XMTP] Message sent successfully');

                // Note: The optimistic message will remain with its pending-* ID.
                // When the real message arrives via stream, it will have a different ID.
                // This creates a brief duplicate until the optimistic message can be reconciled.
                // TODO: Implement message reconciliation to replace optimistic messages with real ones.

                return true;
            } catch (err) {
                console.error('[XMTP] Send message error:', err);
                const message = err instanceof Error ? err.message : 'Failed to send';
                setError(message);
                // Note: In a production app, we might want to remove the optimistic message on failure
                // For now, we keep it as XMTP stream will eventually deliver the real message
                return false;
            }
        },
        [client, user, messageStore, checkCanMessage]
    );

    // ========================================================================
    // MESSAGE HISTORY
    // ========================================================================

    const loadMessageHistory = useCallback(async (conversationId: string): Promise<void> => {
        if (!client) return;

        try {
            const conversation = await client.conversations.getConversationById(conversationId);
            if (!conversation) return;

            const { SortDirection } = await loadXMTPSDK();

            await conversation.sync();
            const raw = await conversation.messages({ limit: 50n, direction: SortDirection.Descending });
            const ascending = [...raw].reverse();

            const myInboxId = (client.inboxId || '').toLowerCase();

            const fetched: StoreMessage[] = [];
            for (const msg of ascending) {
                const text = getMessageText(msg.content);
                if (!text) continue; // drop reactions/system messages/etc.

                fetched.push({
                    id: msg.id,
                    senderAddress: msg.senderInboxId,
                    content: sanitizeMessage(text),
                    timestamp: new Date(Number(msg.sentAtNs) / 1_000_000),
                    isSent: msg.senderInboxId.toLowerCase() === myInboxId,
                });
            }

            const fetchedContents = new Set(fetched.map((m) => m.content));

            // Keep optimistic messages that haven't been reconciled into the fetched
            // history yet; everything else from the existing store is superseded by
            // the canonical fetched history.
            const existing = useMessageStore.getState().messages.get(conversationId) || [];
            const keptOptimistic = existing.filter(
                (m) => m.id.startsWith('pending-') && !fetchedContents.has(m.content)
            );

            const merged = [...fetched, ...keptOptimistic].sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );

            messageStore.setMessages(conversationId, merged);
        } catch (err) {
            console.error('[XMTP] Load message history error:', err);
        }
    }, [client, messageStore]);

    // ========================================================================
    // GROUP METHODS
    // ========================================================================

    const createGroup = useCallback(
        async (memberAddresses: string[], options?: GroupOptions): Promise<Group | null> => {
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

                const groupOptions: CreateGroupOptions = {
                    groupName: options?.name,
                    groupImageUrlSquare: options?.imageUrl,
                    groupDescription: options?.description,
                };

                // V3 API: Resolve all member addresses to inbox IDs
                console.log('[XMTP] Resolving member addresses to inbox IDs...');
                const inboxIds: string[] = [];

                for (const address of memberAddresses) {
                    const inboxId = await getInboxIdFromAddress(client, address);
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

                // Create group with inbox IDs using SDK v6 API
                console.log('[XMTP] Creating group with', inboxIds.length, 'inbox IDs');
                const group = await client.conversations.createGroup(inboxIds, groupOptions);

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
                if (!conversation || !('addMembersByIdentifiers' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                const { IdentifierKind } = await loadXMTPSDK();
                const identifiers: Identifier[] = memberAddresses.map((addr) => ({
                    identifier: addr.toLowerCase(),
                    identifierKind: IdentifierKind.Ethereum,
                }));

                await conversation.addMembersByIdentifiers(identifiers);
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
                if (!conversation || !('removeMembersByIdentifiers' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                const { IdentifierKind } = await loadXMTPSDK();
                const identifiers: Identifier[] = memberAddresses.map((addr) => ({
                    identifier: addr.toLowerCase(),
                    identifierKind: IdentifierKind.Ethereum,
                }));

                await conversation.removeMembersByIdentifiers(identifiers);
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
                if (!conversation || !('requestRemoval' in conversation)) {
                    setError('Group not found');
                    return false;
                }

                // XMTP has no direct "leave" call - leaving is modeled as a removal
                // request that the group processes once it syncs.
                await conversation.requestRemoval();
                messageStore.removeConversation(groupId);
                logSecurityEvent('Left group', { groupId });
                return true;
            } catch (err) {
                console.error('[XMTP] Leave group error:', err);
                setError(err instanceof Error ? err.message : 'Failed to leave group');
                return false;
            }
        },
        [client, messageStore]
    );

    const updateGroupInfo = useCallback(
        async (groupId: string, updates: GroupOptions): Promise<boolean> => {
            if (!client) {
                setError('Not connected to XMTP');
                return false;
            }

            try {
                console.log('[XMTP] Updating group info:', { groupId, updates });

                // Sync all conversations first to ensure we have the latest state
                console.log('[XMTP] Syncing all conversations...');
                const { ConsentState, PermissionLevel } = await loadXMTPSDK();
                await client.conversations.syncAll([ConsentState.Allowed, ConsentState.Unknown]);

                // Get the group
                const conversation = await (client as Client).conversations.getConversationById(groupId);
                if (!conversation) {
                    console.error('[XMTP] Group not found with ID:', groupId);
                    setError('Group not found');
                    return false;
                }

                console.log('[XMTP] Found conversation, checking type...');

                // Check if it's actually a group (not a DM)
                if (!('updateName' in conversation)) {
                    console.error('[XMTP] Conversation is not a group');
                    setError('This is not a group conversation');
                    return false;
                }

                const group = conversation;

                // Sync the group specifically
                console.log('[XMTP] Syncing group...');
                await group.sync();

                // Check if user has permission by getting members and checking admin status
                const members = await group.members();
                const currentMember = members.find((m) => m.inboxId === client.inboxId);

                console.log('[XMTP] Current user member info:', {
                    found: !!currentMember,
                    permissionLevel: currentMember?.permissionLevel,
                    inboxId: client.inboxId,
                });

                // Note: According to XMTP default policy, all members can update metadata
                // But if custom permissions are set, we should check
                if (
                    currentMember &&
                    currentMember.permissionLevel !== PermissionLevel.Admin &&
                    currentMember.permissionLevel !== PermissionLevel.SuperAdmin
                ) {
                    console.log('[XMTP] User is not admin, but trying update (default policy allows all members)');
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

                if (updates.description) {
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
                console.log('[XMTP] Final sync after updates...');
                await group.sync();

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
                const conversation = await (client as Client).conversations.getConversationById(groupId);
                if (!conversation || !('members' in conversation)) {
                    return [];
                }

                const { IdentifierKind, PermissionLevel } = await loadXMTPSDK();
                const members = await conversation.members();
                return members.map((m) => ({
                    inboxId: m.inboxId,
                    address: m.accountIdentifiers.find((i) => i.identifierKind === IdentifierKind.Ethereum)?.identifier ?? m.inboxId,
                    isAdmin: m.permissionLevel === PermissionLevel.Admin,
                    isSuperAdmin: m.permissionLevel === PermissionLevel.SuperAdmin,
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

                // Optimistic update - add to store immediately for instant UI feedback
                const optimisticMessageId = `pending-${crypto.randomUUID()}`;
                const optimisticMessage: StoreMessage = {
                    id: optimisticMessageId,
                    senderAddress: client.inboxId || '',
                    content: sanitized,
                    timestamp: new Date(),
                    isSent: true, // Always true for messages we send
                };

                // Add optimistic message to the store
                messageStore.addMessage(groupId, optimisticMessage);
                console.log('[XMTP] Added optimistic group message to UI');

                // Actually send the message using sendText per SDK v6 API
                await conversation.sendText(sanitized);
                console.log('[XMTP] Group message sent successfully');

                // Note: The optimistic message will remain with its pending-* ID.
                // When the real message arrives via stream, it will have a different ID.
                // This creates a brief duplicate until the optimistic message can be reconciled.
                // TODO: Implement message reconciliation to replace optimistic messages with real ones.

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

            if (!client) return defaultRole;

            try {
                const { ConsentState, PermissionLevel } = await loadXMTPSDK();
                await client.conversations.syncAll([ConsentState.Allowed, ConsentState.Unknown]);
                const conversation = await (client as Client).conversations.getConversationById(groupId);

                if (!conversation || !('members' in conversation)) {
                    return defaultRole;
                }

                const members = await conversation.members();
                const currentMember = members.find((m) => m.inboxId === client.inboxId);

                if (!currentMember) {
                    return defaultRole;
                }

                return {
                    isAdmin: currentMember.permissionLevel === PermissionLevel.Admin,
                    isSuperAdmin: currentMember.permissionLevel === PermissionLevel.SuperAdmin,
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
    // CONSENT MANAGEMENT METHODS
    // ========================================================================

    /**
     * Set consent state for a conversation (accept or block)
     */
    const setConversationConsent = useCallback(async (
        conversationId: string,
        state: 'allowed' | 'denied'
    ): Promise<boolean> => {
        if (!client) {
            console.log('[XMTP] setConversationConsent: no client');
            return false;
        }

        try {
            const { ConsentState } = await loadXMTPSDK();
            const conversation = await client.conversations.getConversationById(conversationId);

            if (!conversation) {
                console.error('[XMTP] Conversation not found:', conversationId);
                return false;
            }

            const consentValue = state === 'allowed' ? ConsentState.Allowed : ConsentState.Denied;
            // Use the simpler conversation-level method per SDK v6 docs
            await conversation.updateConsentState(consentValue);

            console.log('[XMTP] Set conversation consent to ' + state);
            logSecurityEvent('Consent updated: ' + conversationId + ' -> ' + state);
            return true;
        } catch (err) {
            console.error('[XMTP] Failed to set conversation consent:', err);
            return false;
        }
    }, [client]);

    /**
     * Set consent state for an inbox ID (block/allow a user across all conversations)
     */
    const setInboxIdConsent = useCallback(async (
        inboxId: string,
        state: 'allowed' | 'denied'
    ): Promise<boolean> => {
        if (!client) {
            console.log('[XMTP] setInboxIdConsent: no client');
            return false;
        }

        try {
            const { ConsentState, ConsentEntityType } = await loadXMTPSDK();
            const consentValue = state === 'allowed' ? ConsentState.Allowed : ConsentState.Denied;

            await client.preferences.setConsentStates([{
                entityType: ConsentEntityType.InboxId,
                entity: inboxId,
                state: consentValue,
            }]);

            console.log('[XMTP] Set inbox consent to ' + state);
            logSecurityEvent('Inbox consent updated: ' + inboxId + ' -> ' + state);
            return true;
        } catch (err) {
            console.error('[XMTP] Failed to set inbox consent:', err);
            return false;
        }
    }, [client]);

    /**
     * Get the current consent state for a conversation
     */
    const getConversationConsent = useCallback(async (
        conversationId: string
    ): Promise<'allowed' | 'denied' | 'unknown' | null> => {
        if (!client) {
            return null;
        }

        try {
            const { ConsentState } = await loadXMTPSDK();
            const conversation = await client.conversations.getConversationById(conversationId);

            if (!conversation) {
                return null;
            }

            const consentState = await conversation.consentState();

            if (consentState === ConsentState.Allowed) return 'allowed';
            if (consentState === ConsentState.Denied) return 'denied';
            return 'unknown';
        } catch (err) {
            console.error('[XMTP] Failed to get conversation consent:', err);
            return null;
        }
    }, [client]);

    /**
     * Load all conversations with Unknown consent state (message requests)
     */
    const loadMessageRequests = useCallback(async (): Promise<Array<{ conversation: Conversation | Group; type: 'dm' | 'group' }>> => {
        if (!client) {
            return [];
        }

        try {
            const { ConsentState } = await loadXMTPSDK();

            // Sync conversations with Unknown consent state
            await client.conversations.syncAll([ConsentState.Unknown]);

            // Get DMs and Groups separately
            const [dms, groups] = await Promise.all([
                client.conversations.listDms(),
                client.conversations.listGroups(),
            ]);

            const requests: Array<{ conversation: Conversation | Group; type: 'dm' | 'group' }> = [];

            // Check each DM's consent state
            for (const dm of dms) {
                const consentState = await dm.consentState();
                if (consentState === ConsentState.Unknown) {
                    requests.push({ conversation: dm, type: 'dm' });
                }
            }

            // Check each Group's consent state
            for (const group of groups) {
                const consentState = await group.consentState();
                if (consentState === ConsentState.Unknown) {
                    requests.push({ conversation: group, type: 'group' });
                }
            }

            console.log('[XMTP] Loaded ' + requests.length + ' message requests');
            return requests;
        } catch (err) {
            console.error('[XMTP] Failed to load message requests:', err);
            return [];
        }
    }, [client]);

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
        loadMessageHistory,
        createGroup,
        addGroupMembers,
        removeGroupMembers,
        leaveGroup,
        updateGroupInfo,
        getGroupMembers,
        sendGroupMessage,
        getMyGroupRole,
        // Consent management
        setConversationConsent,
        setInboxIdConsent,
        getConversationConsent,
        loadMessageRequests,
    };
}
