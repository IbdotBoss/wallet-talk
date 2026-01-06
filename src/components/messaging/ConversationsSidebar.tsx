/**
 * Conversations Sidebar - Left panel in 2-column layout
 * 
 * Features:
 * - Messages header with compose button
 * - Search bar
 * - Pinned conversations section
 * - All messages section
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useIdentityStore } from '@/store/identityStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress, validateAddress } from '@/lib/SecurityService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';

interface ConversationsSidebarProps {
    onSelectConversation: (address: string) => void;
    selectedAddress?: string;
}

export function ConversationsSidebar({
    onSelectConversation,
    selectedAddress
}: ConversationsSidebarProps) {
    const navigate = useNavigate();
    const { user } = usePrivy();
    const { conversations, isLoading } = useMessageStore();
    const { identity } = useIdentityStore();
    const { isConnected, isConnecting, startConversation } = useSecureXMTP();

    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);

    // Mock pinned state (in production, would come from store)
    const [pinnedAddresses] = useState<Set<string>>(new Set());

    // Use identity store for display name
    const userDisplayName = identity?.displayName || null;

    // Filter conversations by search
    const filteredConversations = (conversations || []).filter(conv => {
        // Skip invalid conversations
        if (!conv || !conv.peerAddress) return false;
        if (!searchQuery) return true;
        const handle = getHandleForAddress(conv.peerAddress) || '';
        return (
            conv.peerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
            handle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    // Separate pinned and regular
    const pinnedConversations = filteredConversations.filter(c => c && pinnedAddresses.has(c.peerAddress));
    const regularConversations = filteredConversations.filter(c => c && !pinnedAddresses.has(c.peerAddress));

    const formatTime = (date?: Date | string) => {
        if (!date) return '';
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';

        const now = new Date();
        const diff = now.getTime() - dateObj.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (minutes < 1) return 'Now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleNewChat = () => {
        triggerHaptic('medium');
        setShowNewChat(true);
        setNewAddress('');
        setInputError(null);
    };

    const handleStartConversation = async () => {
        if (!validateAddress(newAddress)) {
            setInputError('Please enter a valid Ethereum address');
            hapticError();
            return;
        }

        setIsStarting(true);
        try {
            const conversation = await startConversation(newAddress);
            if (conversation) {
                hapticSuccess();
                setShowNewChat(false);
                onSelectConversation(newAddress);
            } else {
                setInputError('Failed to start conversation');
                hapticError();
            }
        } catch {
            setInputError('Failed to start conversation');
            hapticError();
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white relative">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                        {userDisplayName && (
                            <p className="text-sm text-gray-500">{userDisplayName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Settings button */}
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {/* Compose button */}
                        <button
                            onClick={handleNewChat}
                            disabled={!isConnected}
                            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50"
                            aria-label="New conversation"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all"
                    />
                </div>

                {/* Connection Status */}
                {!isConnected && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-gray-500">
                            {isConnecting ? 'Connecting...' : 'Offline'}
                        </span>
                    </div>
                )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-900 font-medium mb-1">No conversations</p>
                        <p className="text-gray-500 text-sm">Start a new chat to begin</p>
                    </div>
                ) : (
                    <>
                        {/* Pinned Section */}
                        {pinnedConversations.length > 0 && (
                            <div className="px-4 pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pinned</span>
                                    <span className="text-xs text-gray-400">{pinnedConversations.length}</span>
                                </div>
                                {pinnedConversations.map((conv) => (
                                    <ConversationItem
                                        key={conv.topic}
                                        conversation={conv}
                                        isSelected={selectedAddress === conv.peerAddress}
                                        isPinned={true}
                                        onSelect={() => onSelectConversation(conv.peerAddress)}
                                        formatTime={formatTime}
                                    />
                                ))}
                            </div>
                        )}

                        {/* All Messages Section */}
                        <div className="px-4 pt-4">
                            {pinnedConversations.length > 0 && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Messages</span>
                                </div>
                            )}
                            {regularConversations.map((conv) => (
                                <ConversationItem
                                    key={conv.topic}
                                    conversation={conv}
                                    isSelected={selectedAddress === conv.peerAddress}
                                    isPinned={false}
                                    onSelect={() => onSelectConversation(conv.peerAddress)}
                                    formatTime={formatTime}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* FAB for new conversation */}
            <motion.button
                onClick={handleNewChat}
                disabled={!isConnected}
                className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-black shadow-lg flex items-center justify-center disabled:opacity-50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="New conversation"
            >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </motion.button>

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">New Conversation</h2>
                                <button
                                    onClick={() => setShowNewChat(false)}
                                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-gray-500 text-sm mb-4">
                                Enter an Ethereum address to start a secure conversation.
                            </p>

                            <input
                                type="text"
                                value={newAddress}
                                onChange={(e) => {
                                    setNewAddress(e.target.value);
                                    setInputError(null);
                                }}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-black mb-3"
                                autoFocus
                            />

                            {inputError && (
                                <p className="text-red-500 text-sm mb-3">{inputError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewChat(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartConversation}
                                    disabled={isStarting || !newAddress}
                                    className="flex-1 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {isStarting ? 'Starting...' : 'Start Chat'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Conversation Item Component
interface ConversationItemProps {
    conversation: {
        topic: string;
        peerAddress: string;
        lastMessage?: string;
        lastMessageTime?: Date;
        unreadCount: number;
    };
    isSelected: boolean;
    isPinned: boolean;
    onSelect: () => void;
    formatTime: (date?: Date) => string;
}

function ConversationItem({
    conversation,
    isSelected,
    isPinned,
    onSelect,
    formatTime
}: ConversationItemProps) {
    // Guard clause - return null if conversation is invalid
    if (!conversation || !conversation.peerAddress) {
        return null;
    }

    const peerHandle = getHandleForAddress(conversation.peerAddress);

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all ${isSelected
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
                }`}
        >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                    {peerHandle ? peerHandle[1]?.toUpperCase() : (conversation.peerAddress?.[2] || '?').toUpperCase()}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 truncate">
                        {peerHandle || truncateAddress(conversation.peerAddress)}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(conversation.lastMessageTime)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate pr-2">
                        {conversation.lastMessage || 'No messages yet'}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                    )}
                    {isPinned && conversation.unreadCount === 0 && (
                        <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                    )}
                </div>
            </div>
        </button>
    );
}
