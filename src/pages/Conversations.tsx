/**
 * Conversations Page - List of all chats
 * 
 * Premium UI with stagger animations and glassmorphism.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress } from '@/lib/SecurityService';
import { triggerHaptic } from '@/lib/haptics';

export function Conversations() {
    const navigate = useNavigate();
    const { authenticated, logout, user } = usePrivy();
    const { conversations, isLoading } = useMessageStore();
    const { isConnecting, isConnected } = useSecureXMTP();

    // Redirect to onboarding if not authenticated
    useEffect(() => {
        if (!authenticated) {
            navigate('/');
        }
    }, [authenticated, navigate]);

    const handleOpenChat = (address: string) => {
        triggerHaptic('light');
        navigate(`/chat/${address}`);
    };

    const handleNewChat = () => {
        triggerHaptic('medium');
        // TODO: Open new conversation modal
    };

    const handleSettings = () => {
        triggerHaptic('light');
        navigate('/settings');
    };

    const userHandle = user?.wallet?.address
        ? getHandleForAddress(user.wallet.address)
        : null;

    const formatTime = (date?: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (hours < 48) return 'Yesterday';
        return date.toLocaleDateString();
    };

    return (
        <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
            {/* Header */}
            <motion.header
                className="glass sticky top-0 z-20 px-6 py-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
                        <p className="text-text-muted text-sm">{userHandle || 'Loading...'}</p>
                    </div>
                    <button
                        onClick={handleSettings}
                        className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>

                {/* Connection status */}
                {(isConnecting || !isConnected) && (
                    <motion.div
                        className="mt-3 flex items-center gap-2 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            className="w-2 h-2 rounded-full bg-warning"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-text-muted">
                            {isConnecting ? 'Connecting to XMTP...' : 'Reconnecting...'}
                        </span>
                    </motion.div>
                )}
            </motion.header>

            {/* Conversation list */}
            <div className="flex-1 px-4 py-4 overflow-y-auto">
                {isLoading ? (
                    // Loading skeleton
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="shimmer h-20 rounded-2xl" />
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    // Empty state
                    <motion.div
                        className="flex flex-col items-center justify-center h-full text-center py-20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">No conversations yet</h3>
                        <p className="text-text-muted text-sm mb-6">Start a new chat to get going</p>
                        <button onClick={handleNewChat} className="btn-primary">
                            New Conversation
                        </button>
                    </motion.div>
                ) : (
                    // Conversation list with stagger animation
                    <motion.div
                        className="space-y-2"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.05,
                                },
                            },
                        }}
                    >
                        {conversations.map((conversation) => {
                            const peerHandle = getHandleForAddress(conversation.peerAddress);

                            return (
                                <motion.button
                                    key={conversation.topic}
                                    onClick={() => handleOpenChat(conversation.peerAddress)}
                                    className="w-full glass-card p-4 flex items-center gap-4 hover:bg-surface-hover transition-colors text-left group"
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 },
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">
                                            {peerHandle ? peerHandle[1].toUpperCase() : conversation.peerAddress[2].toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-text-primary truncate">
                                                {peerHandle || truncateAddress(conversation.peerAddress)}
                                            </span>
                                            <span className="text-text-muted text-xs flex-shrink-0 ml-2">
                                                {formatTime(conversation.lastMessageTime)}
                                            </span>
                                        </div>
                                        <p className="text-text-secondary text-sm truncate">
                                            {conversation.lastMessage || 'No messages yet'}
                                        </p>
                                    </div>

                                    {/* Unread badge */}
                                    {conversation.unreadCount > 0 && (
                                        <motion.div
                                            className="w-6 h-6 rounded-full bg-accent flex items-center justify-center"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                        >
                                            <span className="text-white text-xs font-semibold">
                                                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                            </span>
                                        </motion.div>
                                    )}

                                    {/* Arrow */}
                                    <svg
                                        className="w-5 h-5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </div>

            {/* FAB for new conversation */}
            <motion.button
                onClick={handleNewChat}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent shadow-glow flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </motion.button>
        </div>
    );
}
