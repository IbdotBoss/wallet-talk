/**
 * Message Store - Zustand state management for conversations and messages
 * 
 * Supports both DM and Group conversations.
 * Integrates with BlocklistService for filtering.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isBlocked } from '@/lib/BlocklistService';

export interface Message {
    id: string;
    senderAddress: string;
    content: string;
    timestamp: Date;
    isSent: boolean;
    // Future: contentType, replyTo, reactions
}

export interface Conversation {
    peerAddress: string;         // For DMs: peer's Ethereum address (0x...), or '' if unresolvable. For groups: ''
    topic: string;               // Unique conversation identifier
    type: 'dm' | 'group';        // Conversation type
    groupName?: string;          // For groups: display name
    groupImageUrl?: string;      // For groups: avatar URL
    memberCount?: number;        // For groups: number of members
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    // XMTP consent state
    consentState?: 'allowed' | 'denied' | 'unknown';
    addedByInboxId?: string;     // For groups: who added you
    peerInboxId?: string;        // For DMs: peer's XMTP inbox ID (64-char hex, no 0x)
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================
// JSON.stringify/parse (used by the persist middleware's default storage)
// turns Date fields into strings, so the shape read back from localStorage
// only *looks* like Message/Conversation — timestamps are actually strings
// until revived below.

type PersistedMessage = Omit<Message, 'timestamp'> & { timestamp: Date | string };
type PersistedConversation = Omit<Conversation, 'lastMessageTime'> & {
    lastMessageTime?: Date | string;
};

interface PersistedState {
    conversations: PersistedConversation[];
    messages: Record<string, PersistedMessage[]>;
    activeFilter: 'all' | 'dms' | 'groups' | 'requests';
}

interface RevivedState {
    conversations: Conversation[];
    messages: Record<string, Message[]>;
    activeFilter: 'all' | 'dms' | 'groups' | 'requests';
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function toDate(value: Date | string | undefined | null): Date | undefined {
    if (value == null) return undefined;
    return value instanceof Date ? value : new Date(value);
}

/**
 * Revives Date fields lost to JSON serialization, and (optionally) migrates
 * legacy conversations whose `peerAddress` was mistakenly populated with an
 * XMTP inbox ID instead of an Ethereum address, moving it to `peerInboxId`.
 *
 * Exported as a pure function so it can be unit tested directly and reused
 * by both `migrate` (legacy versions) and `onRehydrateStorage` (every load).
 */
export function reviveAndMigrate(
    raw: PersistedState,
    options: { migrateInboxIds: boolean }
): RevivedState {
    const messages: Record<string, Message[]> = {};
    for (const [topic, msgs] of Object.entries(raw.messages || {})) {
        messages[topic] = (msgs || []).map((m) => ({
            ...m,
            timestamp: toDate(m.timestamp) as Date,
        }));
    }

    const conversations: Conversation[] = (raw.conversations || []).map((c) => {
        let peerAddress = c.peerAddress;
        let peerInboxId = c.peerInboxId;

        if (
            options.migrateInboxIds &&
            c.type === 'dm' &&
            peerAddress &&
            !ETH_ADDRESS_REGEX.test(peerAddress)
        ) {
            peerInboxId = peerAddress;
            peerAddress = '';
        }

        return {
            ...c,
            peerAddress,
            peerInboxId,
            lastMessageTime: toDate(c.lastMessageTime),
        };
    });

    return {
        conversations,
        messages,
        activeFilter: raw.activeFilter,
    };
}

interface MessageState {
    // State
    conversations: Conversation[];
    messages: Map<string, Message[]>;
    isLoading: boolean;
    error: string | null;

    // Filter state for unified list
    activeFilter: 'all' | 'dms' | 'groups' | 'requests';

    // Actions - Conversations
    setConversations: (conversations: Conversation[]) => void;
    addConversation: (conversation: Conversation) => void;
    updateConversation: (topic: string, updates: Partial<Conversation>) => void;
    removeConversation: (topic: string) => void;

    // Actions - Messages
    setMessages: (topic: string, messages: Message[]) => void;
    addMessage: (topic: string, message: Message) => void;
    replaceMessage: (topic: string, oldId: string, newMessage: Message) => void;
    markAsRead: (topic: string) => void;

    // Actions - Filter
    setFilter: (filter: 'all' | 'dms' | 'groups' | 'requests') => void;

    // Actions - Utility
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearAll: () => void;

    // Selectors
    getFilteredConversations: () => Conversation[];
    getConversationByTopic: (topic: string) => Conversation | undefined;
    getDmConversations: () => Conversation[];
    getGroupConversations: () => Conversation[];
    // Consent-based selectors
    getAllowedConversations: () => Conversation[];
    getMessageRequests: () => Conversation[];
    getDeniedConversations: () => Conversation[];

    // Consent actions
    updateConversationConsent: (topic: string, consentState: 'allowed' | 'denied' | 'unknown') => void;
}

export const useMessageStore = create<MessageState>()(
    persist(
        (set, get) => ({
            conversations: [],
            messages: new Map(),
            isLoading: false,
            error: null,
            activeFilter: 'all',

            // ================================================================
            // CONVERSATION ACTIONS
            // ================================================================

            setConversations: (conversations) => {
                // Filter out blocked addresses (only for DMs)
                const filtered = conversations.filter(
                    (c) => c.type === 'group' || !isBlocked(c.peerAddress)
                );
                // Sort by lastMessageTime (newest first)
                filtered.sort((a, b) => {
                    const timeA = a.lastMessageTime?.getTime() || 0;
                    const timeB = b.lastMessageTime?.getTime() || 0;
                    return timeB - timeA;
                });
                set({ conversations: filtered });
            },

            addConversation: (conversation) => {
                // Don't add if DM and blocked
                if (conversation.type === 'dm' && isBlocked(conversation.peerAddress)) return;

                set((state) => {
                    // Check if already exists
                    const exists = state.conversations.find(c => c.topic === conversation.topic);
                    if (exists) {
                        // Update existing
                        return {
                            conversations: state.conversations.map(c =>
                                c.topic === conversation.topic ? { ...c, ...conversation } : c
                            ),
                        };
                    }
                    // Add new at the beginning
                    return {
                        conversations: [conversation, ...state.conversations],
                    };
                });
            },

            updateConversation: (topic, updates) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.topic === topic ? { ...c, ...updates } : c
                    ),
                }));
            },

            removeConversation: (topic) => {
                set((state) => ({
                    conversations: state.conversations.filter((c) => c.topic !== topic),
                }));
            },

            // ================================================================
            // MESSAGE ACTIONS
            // ================================================================

            setMessages: (topic, messages) => {
                const newMap = new Map(get().messages);
                // Filter messages from blocked addresses
                const filtered = messages.filter(
                    (m) => !isBlocked(m.senderAddress)
                );
                newMap.set(topic, filtered);
                set({ messages: newMap });
            },

            addMessage: (topic, message) => {
                // Don't add if from blocked address
                if (isBlocked(message.senderAddress)) return;

                const newMap = new Map(get().messages);
                const existing = newMap.get(topic) || [];

                // Prevent duplicates
                if (existing.some((m) => m.id === message.id)) return;

                newMap.set(topic, [...existing, message]);
                set({ messages: newMap });

                // Update conversation last message and move to top
                set((state) => {
                    const updatedConversations = state.conversations.map((c) =>
                        c.topic === topic
                            ? {
                                ...c,
                                lastMessage: message.content,
                                lastMessageTime: message.timestamp,
                                unreadCount: message.isSent ? c.unreadCount : c.unreadCount + 1,
                            }
                            : c
                    );
                    // Sort to move updated conversation to top
                    updatedConversations.sort((a, b) => {
                        const timeA = a.lastMessageTime?.getTime() || 0;
                        const timeB = b.lastMessageTime?.getTime() || 0;
                        return timeB - timeA;
                    });
                    return { conversations: updatedConversations };
                });
            },

            replaceMessage: (topic, oldId, newMessage) => {
                const newMap = new Map(get().messages);
                const existing = newMap.get(topic) || [];

                // Find and replace
                const updated = existing.map(m => m.id === oldId ? newMessage : m);

                newMap.set(topic, updated);
                set({ messages: newMap });
            },

            markAsRead: (topic) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.topic === topic ? { ...c, unreadCount: 0 } : c
                    ),
                }));
            },

            // ================================================================
            // FILTER ACTIONS
            // ================================================================

            setFilter: (filter) => {
                set({ activeFilter: filter });
            },

            // ================================================================
            // UTILITY ACTIONS
            // ================================================================

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            clearAll: () => {
                set({
                    conversations: [],
                    messages: new Map(),
                    error: null,
                    activeFilter: 'all',
                });
            },

            // ================================================================
            // SELECTORS
            // ================================================================

            getFilteredConversations: () => {
                const { conversations, activeFilter } = get();
                // Helper to check if conversation is allowed (default) or unknown/denied
                const isAllowed = (c: Conversation) => c.consentState === 'allowed' || c.consentState === undefined;

                switch (activeFilter) {
                    case 'dms':
                        return conversations.filter(c => c.type === 'dm' && isAllowed(c));
                    case 'groups':
                        return conversations.filter(c => c.type === 'group' && isAllowed(c));
                    case 'requests':
                        return conversations.filter(c => c.consentState === 'unknown');
                    default:
                        // 'all' - only show allowed
                        return conversations.filter(c => isAllowed(c));
                }
            },

            getConversationByTopic: (topic) => {
                return get().conversations.find(c => c.topic === topic);
            },

            getDmConversations: () => {
                return get().conversations.filter(c => c.type === 'dm');
            },

            getGroupConversations: () => {
                return get().conversations.filter(c => c.type === 'group');
            },

            // Consent-based selectors
            getAllowedConversations: () => {
                return get().conversations.filter(c =>
                    c.consentState === 'allowed' || c.consentState === undefined
                );
            },

            getMessageRequests: () => {
                return get().conversations.filter(c => c.consentState === 'unknown');
            },

            getDeniedConversations: () => {
                return get().conversations.filter(c => c.consentState === 'denied');
            },

            // Consent actions
            updateConversationConsent: (topic, consentState) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.topic === topic ? { ...c, consentState } : c
                    ),
                }));
            },
        }),
        {
            name: 'antigravity-messages',
            version: 2,
            // Persist conversations AND messages now
            partialize: (state) => ({
                conversations: state.conversations,
                // Convert Map to object for storage. Defensive: immediately after
                // `migrate` runs, the merged (pre-hydration-callback) state briefly
                // holds `messages` as a plain object rather than a Map (persist calls
                // setItem() right after merging migrated state, before
                // onRehydrateStorage gets a chance to rebuild the Map) — passing that
                // straight through avoids crashing on Object.fromEntries(non-iterable).
                messages:
                    state.messages instanceof Map
                        ? Object.fromEntries(state.messages)
                        : state.messages,
                activeFilter: state.activeFilter,
            }),
            // Hydrate Map from object, revive Dates that JSON turned into strings
            onRehydrateStorage: () => (state) => {
                if (!state) return;

                const rawMessages: Record<string, PersistedMessage[]> =
                    state.messages instanceof Map
                        ? (Object.fromEntries(state.messages) as unknown as Record<string, PersistedMessage[]>)
                        : (state.messages as unknown as Record<string, PersistedMessage[]>);

                const revived = reviveAndMigrate(
                    {
                        conversations: state.conversations as unknown as PersistedConversation[],
                        messages: rawMessages,
                        activeFilter: state.activeFilter,
                    },
                    { migrateInboxIds: false }
                );

                state.conversations = revived.conversations;
                state.messages = new Map(Object.entries(revived.messages));
            },
            // Migrate legacy persisted state (versions < 2): revive Dates and purge
            // XMTP inbox IDs that were mistakenly stored in peerAddress.
            migrate: (persistedState, version) => {
                const raw = persistedState as PersistedState;
                if (version < 2) {
                    return reviveAndMigrate(raw, { migrateInboxIds: true });
                }
                return raw;
            },
        }
    )
);
