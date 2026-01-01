/**
 * useSecureXMTP - XMTP client hook with Privy integration
 * 
 * Connects Privy embedded wallet signer to XMTP.
 * Uses streamMessages() for real-time WebSocket updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Client } from '@xmtp/xmtp-js';
import type { Conversation, DecodedMessage } from '@xmtp/xmtp-js';
import { useMessageStore, type Message as StoreMessage, type Conversation as StoreConversation } from '@/store/messageStore';
import { sanitizeMessage, validateAddress, logSecurityEvent } from '@/lib/SecurityService';
import { messageRateLimiter } from '@/lib/RateLimiter';

interface UseSecureXMTPReturn {
    client: Client | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendMessage: (peerAddress: string, content: string) => Promise<boolean>;
    startConversation: (peerAddress: string) => Promise<Conversation | null>;
}

export function useSecureXMTP(): UseSecureXMTPReturn {
    const { authenticated, user } = usePrivy();
    const { wallets } = useWallets();
    const [client, setClient] = useState<Client | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const streamRef = useRef<AsyncGenerator | null>(null);
    const messageStore = useMessageStore();

    const getEmbeddedWallet = useCallback(() => {
        if (!wallets || wallets.length === 0) return null;

        // Prefer embedded wallet, fallback to first available
        const embedded = wallets.find((w) => w.walletClientType === 'privy');
        return embedded || wallets[0];
    }, [wallets]);

    const connect = useCallback(async () => {
        if (!authenticated || client) return;

        const wallet = getEmbeddedWallet();
        if (!wallet) {
            setError('No wallet available');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Get ethereum provider from wallet
            const provider = await wallet.getEthereumProvider();

            // Create XMTP client with the wallet signer
            const xmtpClient = await Client.create(provider, {
                env: 'production',
            });

            setClient(xmtpClient);
            logSecurityEvent('XMTP client connected', { address: wallet.address });

            // Load existing conversations
            await loadConversations(xmtpClient);

            // Start streaming messages
            startMessageStream(xmtpClient);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to connect';
            setError(message);
            logSecurityEvent('XMTP connection failed', { error: message });
        } finally {
            setIsConnecting(false);
        }
    }, [authenticated, client, getEmbeddedWallet]);

    const loadConversations = async (xmtpClient: Client) => {
        try {
            const convos = await xmtpClient.conversations.list();

            const storeConversations: StoreConversation[] = await Promise.all(
                convos.map(async (c) => {
                    const messages = await c.messages({ limit: 1 });
                    const lastMsg = messages[0];

                    return {
                        peerAddress: c.peerAddress,
                        topic: c.topic,
                        lastMessage: lastMsg ? sanitizeMessage(lastMsg.content as string) : undefined,
                        lastMessageTime: lastMsg?.sent,
                        unreadCount: 0,
                    };
                })
            );

            messageStore.setConversations(storeConversations);
        } catch (err) {
            logSecurityEvent('Failed to load conversations', { error: err });
        }
    };

    const startMessageStream = async (xmtpClient: Client) => {
        try {
            // Stream all messages from all conversations
            const stream = await xmtpClient.conversations.streamAllMessages();
            streamRef.current = stream;

            for await (const message of stream) {
                handleIncomingMessage(message);
            }
        } catch (err) {
            logSecurityEvent('Message stream error', { error: err });
        }
    };

    const handleIncomingMessage = (message: DecodedMessage) => {
        const storeMessage: StoreMessage = {
            id: message.id,
            senderAddress: message.senderAddress,
            content: sanitizeMessage(message.content as string),
            timestamp: message.sent,
            isSent: message.senderAddress === client?.address,
        };

        // Find conversation topic from the message
        const conversationTopic = message.conversation?.topic;
        if (conversationTopic) {
            messageStore.addMessage(conversationTopic, storeMessage);
        }
    };

    const disconnect = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.return?.(undefined);
            streamRef.current = null;
        }
        setClient(null);
        logSecurityEvent('XMTP client disconnected');
    }, []);

    const sendMessage = useCallback(
        async (peerAddress: string, content: string): Promise<boolean> => {
            if (!client) {
                setError('Not connected to XMTP');
                return false;
            }

            // Validate address
            if (!validateAddress(peerAddress)) {
                setError('Invalid recipient address');
                return false;
            }

            // Rate limit check
            if (!messageRateLimiter.attempt(user?.id)) {
                setError('Rate limit exceeded. Please wait.');
                return false;
            }

            // Sanitize content
            const sanitized = sanitizeMessage(content);
            if (!sanitized) {
                setError('Message cannot be empty');
                return false;
            }

            try {
                const conversation = await client.conversations.newConversation(peerAddress);
                await conversation.send(sanitized);

                logSecurityEvent('Message sent', {
                    to: peerAddress.slice(0, 10) + '...',
                    length: sanitized.length,
                });

                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to send';
                setError(message);
                logSecurityEvent('Message send failed', { error: message });
                return false;
            }
        },
        [client, user]
    );

    const startConversation = useCallback(
        async (peerAddress: string): Promise<Conversation | null> => {
            if (!client) return null;

            if (!validateAddress(peerAddress)) {
                setError('Invalid address');
                return null;
            }

            try {
                const conversation = await client.conversations.newConversation(peerAddress);

                // Add to store
                messageStore.addConversation({
                    peerAddress: conversation.peerAddress,
                    topic: conversation.topic,
                    unreadCount: 0,
                });

                return conversation;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to start conversation';
                setError(message);
                return null;
            }
        },
        [client, messageStore]
    );

    // Auto-connect when authenticated
    useEffect(() => {
        if (authenticated && !client && !isConnecting) {
            connect();
        }
    }, [authenticated, client, isConnecting, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.return?.(undefined);
            }
        };
    }, []);

    return {
        client,
        isConnecting,
        isConnected: !!client,
        error,
        connect,
        disconnect,
        sendMessage,
        startConversation,
    };
}
