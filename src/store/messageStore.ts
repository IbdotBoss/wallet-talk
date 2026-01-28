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
    peerAddress: string;         // For DMs: peer address. For groups: empty string
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
            // Persist conversations AND messages now
            partialize: (state) => ({
                conversations: state.conversations,
                messages: Object.fromEntries(state.messages), // Convert Map to object for storage
                activeFilter: state.activeFilter,
            }),
            // Hydrate Map from object
            onRehydrateStorage: () => (state) => {
                if (state && state.messages && !(state.messages instanceof Map)) {
                    state.messages = new Map(Object.entries(state.messages));
                }
            },
        }
    )
);
