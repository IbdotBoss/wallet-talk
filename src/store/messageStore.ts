/**
 * Message Store - Zustand state management for conversations and messages
 * 
 * Uses real-time streamMessages() WebSocket listener.
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
}

export interface Conversation {
    peerAddress: string;
    topic: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
}

interface MessageState {
    // State
    conversations: Conversation[];
    messages: Map<string, Message[]>;
    isLoading: boolean;
    error: string | null;

    // Actions
    setConversations: (conversations: Conversation[]) => void;
    addConversation: (conversation: Conversation) => void;
    setMessages: (topic: string, messages: Message[]) => void;
    addMessage: (topic: string, message: Message) => void;
    markAsRead: (topic: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearAll: () => void;
}

export const useMessageStore = create<MessageState>()(
    persist(
        (set, get) => ({
            conversations: [],
            messages: new Map(),
            isLoading: false,
            error: null,

            setConversations: (conversations) => {
                // Filter out blocked addresses
                const filtered = conversations.filter(
                    (c) => !isBlocked(c.peerAddress)
                );
                set({ conversations: filtered });
            },

            addConversation: (conversation) => {
                // Don't add if blocked
                if (isBlocked(conversation.peerAddress)) return;

                set((state) => ({
                    conversations: [
                        conversation,
                        ...state.conversations.filter(
                            (c) => c.topic !== conversation.topic
                        ),
                    ],
                }));
            },

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

                // Update conversation last message
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.topic === topic
                            ? {
                                ...c,
                                lastMessage: message.content,
                                lastMessageTime: message.timestamp,
                                unreadCount: message.isSent ? c.unreadCount : c.unreadCount + 1,
                            }
                            : c
                    ),
                }));
            },

            markAsRead: (topic) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.topic === topic ? { ...c, unreadCount: 0 } : c
                    ),
                }));
            },

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            clearAll: () => {
                set({
                    conversations: [],
                    messages: new Map(),
                    error: null,
                });
            },
        }),
        {
            name: 'antigravity-messages',
            // Only persist conversations, not messages (to limit storage)
            partialize: (state) => ({
                conversations: state.conversations,
            }),
        }
    )
);
