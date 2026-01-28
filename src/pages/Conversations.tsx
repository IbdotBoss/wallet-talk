/**
 * Conversations Page - List of all chats
 * 
 * Premium UI with stagger animations and glassmorphism.
 * Responsive: Desktop sidebar / Mobile full-screen
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress, validateAddress } from '@/lib/SecurityService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';

export function Conversations() {
    const navigate = useNavigate();
    const { authenticated, user } = usePrivy();
    const { conversations, isLoading } = useMessageStore();
    const { isConnecting, isConnected, error, startConversation, connect } = useSecureXMTP();

    const [showNewChat, setShowNewChat] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);

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
        setShowNewChat(true);
        setNewAddress('');
        setInputError(null);
    };

    const handleStartConversation = async () => {
        if (!validateAddress(newAddress)) {
            setInputError('Please enter a valid Ethereum address (0x...)');
            hapticError();
            return;
        }

        setIsStarting(true);
        setInputError(null);

        try {
            const conversation = await startConversation(newAddress);
            if (conversation) {
                hapticSuccess();
                setShowNewChat(false);
                navigate(`/chat/${newAddress}`);
            } else {
                setInputError('Failed to start conversation. Is XMTP connected?');
                hapticError();
            }
        } catch {
            setInputError('Failed to start conversation');
            hapticError();
        } finally {
            setIsStarting(false);
        }
    };

    const handleSettings = () => {
        triggerHaptic('light');
        navigate('/settings');
    };

    const handleRetryConnect = () => {
        triggerHaptic('medium');
        connect();
    };

    const userHandle = user?.wallet?.address
        ? getHandleForAddress(user.wallet.address)
        : null;

    const formatTime = (date?: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (minutes < 1) return 'Now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (hours < 48) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
            {/* Header */}
            <motion.header
                className="header border-b border-border"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo on desktop */}
                        <div className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-text-primary">Messages</h1>
                            <p className="text-text-muted text-sm hidden md:block">{userHandle || 'Loading...'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Connection status badge */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface">
                            <div className={`status-dot ${isConnected ? 'status-online' : isConnecting ? 'status-connecting' : 'status-offline'}`} />
                            <span className="text-xs text-text-secondary">
                                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline'}
                            </span>
                        </div>

                        <button
                            onClick={handleSettings}
                            className="btn-icon"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile connection status */}
                {(isConnecting || !isConnected) && (
                    <motion.div
                        className="md:hidden mt-3 flex items-center justify-between"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <div className="flex items-center gap-2 text-sm">
                            <div className={`status-dot ${isConnecting ? 'status-connecting' : 'status-offline'}`} />
                            <span className="text-text-muted">
                                {isConnecting ? 'Connecting to XMTP...' : error || 'Reconnecting...'}
                            </span>
                        </div>
                        {!isConnecting && (
                            <button
                                onClick={handleRetryConnect}
                                className="text-accent text-sm font-medium"
                            >
                                Retry
                            </button>
                        )}
                    </motion.div>
                )}
            </motion.header>

            {/* Search bar (desktop) */}
            <div className="hidden md:block px-6 py-3 border-b border-border">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <motion.div
                        className="p-4 space-y-3"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.08 } },
                        }}
                    >
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="shimmer h-20 rounded-2xl"
                                variants={{
                                    hidden: { opacity: 0, x: -20 },
                                    visible: { opacity: 1, x: 0 },
                                }}
                            />
                        ))}
                    </motion.div>
                ) : conversations.length === 0 ? (
                    <motion.div
                        className="empty-state h-full"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                            delay: 0.2,
                        }}
                    >
                        <motion.div
                            className="empty-state-icon"
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        >
                            <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </motion.div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">No conversations yet</h3>
                        <p className="text-text-muted text-sm mb-6 max-w-xs">
                            Start a new chat with any Ethereum address to begin messaging
                        </p>
                        <button
                            onClick={handleNewChat}
                            className="btn-primary"
                            disabled={!isConnected}
                        >
                            {isConnected ? 'Start Conversation' : 'Connecting...'}
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        className="py-2"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.06 } },
                        }}
                    >
                        {conversations.map((conversation, index) => {
                            const peerHandle = getHandleForAddress(conversation.peerAddress);
                            return (
                                <motion.button
                                    key={conversation.topic}
                                    onClick={() => handleOpenChat(conversation.peerAddress)}
                                    className="conversation-item w-full text-left group mx-2 md:mx-4"
                                    variants={{
                                        hidden: { opacity: 0, y: 20, scale: 0.95 },
                                        visible: {
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                            transition: {
                                                type: 'spring',
                                                stiffness: 300,
                                                damping: 24,
                                                delay: index * 0.03,
                                            }
                                        },
                                    }}
                                    whileTap={{ scale: 0.97 }}
                                    whileHover={{ x: 4 }}
                                >
                                    {/* Avatar */}
                                    <div className="avatar avatar-lg flex-shrink-0">
                                        <span>
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
                                        <div className="flex items-center justify-between">
                                            <p className="text-text-secondary text-sm truncate pr-2">
                                                {conversation.lastMessage || 'No messages yet'}
                                            </p>
                                            {conversation.unreadCount > 0 && (
                                                <motion.div
                                                    className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                                >
                                                    <span className="text-white text-xs font-semibold">
                                                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chevron (desktop hover) */}
                                    <svg
                                        className="w-5 h-5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
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
                disabled={!isConnected}
                className="fab"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: 0.4,
                    rotate: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                }}
                whileHover={{
                    scale: 1.1,
                    rotate: 90,
                    y: -2,
                }}
                whileTap={{ scale: 0.95, rotate: 90 }}
                aria-label="New conversation"
            >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </motion.button>

            {/* New Conversation Modal */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div
                        className="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            className="absolute inset-0"
                            onClick={() => setShowNewChat(false)}
                        />
                        <motion.div
                            className="modal relative z-10"
                            initial={{ scale: 0.85, opacity: 0, y: 40, rotateX: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 40, rotateX: 10 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                                mass: 0.8,
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-text-primary">New Conversation</h2>
                                <button
                                    onClick={() => setShowNewChat(false)}
                                    className="btn-icon"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-text-secondary text-sm mb-4">
                                Enter an Ethereum address to start a secure, end-to-end encrypted conversation.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-text-muted text-xs mb-2">Wallet Address</label>
                                    <input
                                        type="text"
                                        value={newAddress}
                                        onChange={(e) => {
                                            setNewAddress(e.target.value);
                                            setInputError(null);
                                        }}
                                        placeholder="0x..."
                                        className="w-full"
                                        autoFocus
                                    />
                                </div>

                                {inputError && (
                                    <motion.p
                                        className="text-error text-sm"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {inputError}
                                    </motion.p>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowNewChat(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStartConversation}
                                        disabled={isStarting || !newAddress}
                                        className="btn-primary flex-1"
                                    >
                                        {isStarting ? (
                                            <motion.div
                                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            />
                                        ) : (
                                            'Start Chat'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
