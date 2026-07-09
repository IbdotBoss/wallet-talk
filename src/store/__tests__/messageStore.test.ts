/**
 * Message Store - Persistence revival/migration tests
 *
 * Verifies that Dates lost to JSON serialization are revived on rehydration,
 * and that legacy conversations which stored an XMTP inbox ID in
 * `peerAddress` are migrated to use `peerInboxId` instead.
 */

import { describe, it, expect } from 'vitest';
import { reviveAndMigrate, type Conversation, type Message } from '../messageStore';

describe('reviveAndMigrate', () => {
    const inboxId = 'a'.repeat(64); // 64-char hex, no 0x - legacy XMTP inbox id
    const ethAddress = '0x1234567890abcdef1234567890abcdef12345678';

    const rawConversations = [
        {
            peerAddress: inboxId,
            topic: 'dm-1',
            type: 'dm' as const,
            lastMessageTime: '2024-01-01T00:00:00.000Z',
            unreadCount: 0,
        },
        {
            peerAddress: ethAddress,
            topic: 'dm-2',
            type: 'dm' as const,
            lastMessageTime: '2024-01-02T00:00:00.000Z',
            unreadCount: 0,
        },
        {
            peerAddress: '',
            topic: 'group-1',
            type: 'group' as const,
            lastMessageTime: '2024-01-03T00:00:00.000Z',
            unreadCount: 0,
        },
    ];

    const rawMessages: Record<string, Array<Omit<Message, 'timestamp'> & { timestamp: string }>> = {
        'dm-1': [
            {
                id: 'm1',
                senderAddress: ethAddress,
                content: 'hello',
                timestamp: '2024-01-01T00:00:00.000Z',
                isSent: false,
            },
        ],
    };

    it('revives string timestamps into Date instances', () => {
        const result = reviveAndMigrate(
            {
                conversations: rawConversations,
                messages: rawMessages,
                activeFilter: 'all',
            },
            { migrateInboxIds: false }
        );

        expect(result.conversations[0].lastMessageTime).toBeInstanceOf(Date);
        expect(result.conversations[0].lastMessageTime?.getTime()).toBe(
            new Date('2024-01-01T00:00:00.000Z').getTime()
        );
        expect(result.messages['dm-1'][0].timestamp).toBeInstanceOf(Date);
        expect(result.messages['dm-1'][0].timestamp.getTime()).toBe(
            new Date('2024-01-01T00:00:00.000Z').getTime()
        );
    });

    it('leaves peerAddress/peerInboxId untouched when migrateInboxIds is false', () => {
        const result = reviveAndMigrate(
            {
                conversations: rawConversations,
                messages: rawMessages,
                activeFilter: 'all',
            },
            { migrateInboxIds: false }
        );

        expect(result.conversations[0].peerAddress).toBe(inboxId);
        expect(result.conversations[0].peerInboxId).toBeUndefined();
    });

    it('migrates a legacy inbox-id-as-peerAddress DM to peerInboxId, clearing peerAddress', () => {
        const result = reviveAndMigrate(
            {
                conversations: rawConversations,
                messages: rawMessages,
                activeFilter: 'all',
            },
            { migrateInboxIds: true }
        );

        const dm1 = result.conversations.find((c) => c.topic === 'dm-1') as Conversation;
        expect(dm1.peerAddress).toBe('');
        expect(dm1.peerInboxId).toBe(inboxId);
    });

    it('leaves a valid Ethereum address DM peerAddress unchanged during migration', () => {
        const result = reviveAndMigrate(
            {
                conversations: rawConversations,
                messages: rawMessages,
                activeFilter: 'all',
            },
            { migrateInboxIds: true }
        );

        const dm2 = result.conversations.find((c) => c.topic === 'dm-2') as Conversation;
        expect(dm2.peerAddress).toBe(ethAddress);
        expect(dm2.peerInboxId).toBeUndefined();
    });

    it('leaves group conversations untouched during migration', () => {
        const result = reviveAndMigrate(
            {
                conversations: rawConversations,
                messages: rawMessages,
                activeFilter: 'all',
            },
            { migrateInboxIds: true }
        );

        const group = result.conversations.find((c) => c.topic === 'group-1') as Conversation;
        expect(group.peerAddress).toBe('');
        expect(group.peerInboxId).toBeUndefined();
    });
});

describe('antigravity-messages localStorage rehydration', () => {
    it('round-trips a version-1 persisted payload: revives Dates and migrates inbox-id peerAddress', async () => {
        const inboxId = 'b'.repeat(64);

        const persistedPayload = {
            state: {
                conversations: [
                    {
                        peerAddress: inboxId,
                        topic: 'dm-legacy',
                        type: 'dm',
                        lastMessageTime: '2024-05-01T12:00:00.000Z',
                        unreadCount: 2,
                    },
                ],
                messages: {
                    'dm-legacy': [
                        {
                            id: 'msg-1',
                            senderAddress: '0xabc0000000000000000000000000000000000a',
                            content: 'hi there',
                            timestamp: '2024-05-01T12:00:00.000Z',
                            isSent: false,
                        },
                    ],
                },
                activeFilter: 'all',
            },
            version: 1,
        };

        localStorage.setItem('antigravity-messages', JSON.stringify(persistedPayload));

        // Import after seeding localStorage so the persist middleware picks it up
        // on store creation / rehydration.
        const { useMessageStore } = await import('../messageStore');

        // Wait for async rehydration to finish.
        await useMessageStore.persist.rehydrate();

        const state = useMessageStore.getState();
        const conversation = state.conversations.find((c) => c.topic === 'dm-legacy');

        expect(conversation).toBeDefined();
        expect(conversation?.lastMessageTime).toBeInstanceOf(Date);
        expect(conversation?.peerAddress).toBe('');
        expect(conversation?.peerInboxId).toBe(inboxId);

        const messages = state.messages.get('dm-legacy');
        expect(messages?.[0].timestamp).toBeInstanceOf(Date);
    });
});
