/**
 * Conversations Sidebar - Left panel in 2-column layout
 * 
 * Features:
 * - Messages header with compose button
 * - Filter chips (All / DMs / Groups)
 * - Search bar
 * - Pinned conversations section
 * - All messages section with group support
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessageStore, type Conversation } from '@/store/messageStore';
import { useIdentityStore } from '@/store/identityStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress, validateAddress } from '@/lib/SecurityService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { LiquidGlassAvatar } from '@/components/ui/LiquidGlassAvatar';
import { CreateGroupModal } from '@/components/messaging/CreateGroupModal';
import { ShimmerButtonSimple } from '@/components/ui/shimmer-button-simple';

interface ConversationsSidebarProps {
    onSelectConversation: (addressOrTopic: string, type?: 'dm' | 'group') => void;
    selectedAddress?: string;
}

export function ConversationsSidebar({
    onSelectConversation,
    selectedAddress
}: ConversationsSidebarProps) {
    const navigate = useNavigate();
    const { conversations, isLoading, activeFilter, setFilter, getFilteredConversations } = useMessageStore();
    const { identity } = useIdentityStore();
    const { isConnected, isConnecting, startConversation, connect, error, resetConnection } = useSecureXMTP();
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();

    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isConnectingXMTP, setIsConnectingXMTP] = useState(false);

    // Mock pinned state (in production, would come from store)
    const [pinnedAddresses] = useState<Set<string>>(new Set());

    // Use identity store for display name
    const userDisplayName = identity?.displayName || null;

    // Get filtered conversations based on active filter
    const baseFilteredConversations = getFilteredConversations();

    // Apply search filter
    const filteredConversations = baseFilteredConversations.filter(conv => {
        if (!conv) return false;
        if (!searchQuery) return true;

        // For DMs, search by peer address or handle
        if (conv.type === 'dm') {
            const handle = getHandleForAddress(conv.peerAddress) || '';
            return (
                conv.peerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                handle.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // For groups, search by group name
        if (conv.type === 'group') {
            return conv.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
        }

        return false;
    });

    // Separate pinned and regular (only DMs can be pinned currently)
    const pinnedConversations = filteredConversations.filter(
        c => c && c.type === 'dm' && pinnedAddresses.has(c.peerAddress)
    );
    const regularConversations = filteredConversations.filter(
        c => c && !(c.type === 'dm' && pinnedAddresses.has(c.peerAddress))
    );

    // Counts for filter chips
    const dmCount = conversations.filter(c => c.type === 'dm').length;
    const groupCount = conversations.filter(c => c.type === 'group').length;

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

    const handleNewGroup = () => {
        triggerHaptic('medium');
        setShowNewGroup(true);
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
                onSelectConversation(newAddress, 'dm');
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

    const handleGroupCreated = (groupId: string) => {
        onSelectConversation(groupId, 'group');
    };

    const handleFilterChange = (filter: 'all' | 'dms' | 'groups') => {
        triggerHaptic('light');
        setFilter(filter);
    };

    const handleConnectXMTP = async () => {
        triggerHaptic('medium');
        setIsConnectingXMTP(true);
        try {
            await connect();
            hapticSuccess();
        } catch (err) {
            // Error is already handled by the hook's error state
            console.error('[ConversationsSidebar] XMTP connection failed:', err);
            hapticError();
        } finally {
            setIsConnectingXMTP(false);
        }
    };

    const handleRetryConnection = () => {
        // resetConnection is synchronous and resets state/refs immediately,
        // so there's no race condition with the subsequent connect call
        resetConnection();
        handleConnectXMTP();
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
                        {/* New Group button */}
                        <button
                            onClick={handleNewGroup}
                            disabled={!isConnected}
                            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50"
                            aria-label="New group"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

                {/* Filter Chips */}
                <div className="flex gap-2 mb-3">
                    <FilterChip
                        label="All"
                        count={conversations.length}
                        isActive={activeFilter === 'all'}
                        onClick={() => handleFilterChange('all')}
                    />
                    <FilterChip
                        label="DMs"
                        count={dmCount}
                        isActive={activeFilter === 'dms'}
                        onClick={() => handleFilterChange('dms')}
                    />
                    <FilterChip
                        label="Groups"
                        count={groupCount}
                        isActive={activeFilter === 'groups'}
                        onClick={() => handleFilterChange('groups')}
                    />
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
                        <div className={`w-2 h-2 rounded-full ${isConnecting || isConnectingXMTP ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-gray-500">
                            {isConnecting || isConnectingXMTP ? 'Connecting to XMTP...' : 'Offline'}
                        </span>
                    </div>
                )}
            </div>

            {/* XMTP Connection Card - Shows when not connected */}
            {!isConnected && authenticated && wallets.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200"
                >
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Connect to XMTP
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Enable secure messaging by connecting to the XMTP network. This will prompt you to sign a message.
                            </p>
                            
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl"
                                >
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-xs text-red-700 font-medium">{error}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <ShimmerButtonSimple
                                onClick={error ? handleRetryConnection : handleConnectXMTP}
                                disabled={isConnectingXMTP || isConnecting}
                                className="w-full"
                            >
                                {isConnectingXMTP || isConnecting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <motion.div
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        />
                                        Connecting...
                                    </span>
                                ) : error ? (
                                    'Retry Connection'
                                ) : (
                                    'Connect to XMTP'
                                )}
                            </ShimmerButtonSimple>

                            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                End-to-end encrypted messaging
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

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
                            {activeFilter === 'groups' ? (
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                            {activeFilter === 'groups' ? 'No groups yet' : activeFilter === 'dms' ? 'No direct messages' : 'No conversations'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {activeFilter === 'groups' ? 'Create a group to get started' : 'Start a new chat to begin'}
                        </p>
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
                                        isSelected={selectedAddress === conv.peerAddress || selectedAddress === conv.topic}
                                        isPinned={true}
                                        onSelect={() => onSelectConversation(
                                            conv.type === 'group' ? conv.topic : conv.peerAddress,
                                            conv.type
                                        )}
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
                                    isSelected={selectedAddress === conv.peerAddress || selectedAddress === conv.topic}
                                    isPinned={false}
                                    onSelect={() => onSelectConversation(
                                        conv.type === 'group' ? conv.topic : conv.peerAddress,
                                        conv.type
                                    )}
                                    formatTime={formatTime}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <motion.button
                onClick={handleNewChat}
                disabled={!isConnected}
                className="fixed md:absolute bottom-6 right-6 w-14 h-14 rounded-full bg-black shadow-lg flex items-center justify-center disabled:opacity-50 z-40 transition-transform active:scale-95 hover:scale-105"
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

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={showNewGroup}
                onClose={() => setShowNewGroup(false)}
                onGroupCreated={handleGroupCreated}
            />
        </div>
    );
}

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================

interface FilterChipProps {
    label: string;
    count?: number;
    isActive: boolean;
    onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
    return (
        <motion.button
            onClick={onClick}
            className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-1.5 ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                    {count}
                </span>
            )}
        </motion.button>
    );
}

// ============================================================================
// CONVERSATION ITEM COMPONENT
// ============================================================================

interface ConversationItemProps {
    conversation: Conversation;
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
    const { identity } = useIdentityStore();

    // Handle both DM and Group conversations
    const isGroup = conversation.type === 'group';

    // For DMs
    const peerHandle = !isGroup ? getHandleForAddress(conversation.peerAddress) : null;
    const isMe = !isGroup && identity && conversation.peerAddress.toLowerCase() === identity.walletAddress.toLowerCase();

    // Display name logic
    let displayName: string;
    let avatarUrl: string | undefined;
    let avatarAddress: string;

    if (isGroup) {
        displayName = conversation.groupName || 'Unnamed Group';
        avatarUrl = conversation.groupImageUrl;
        avatarAddress = conversation.topic; // Use topic for consistent avatar generation
    } else if (isMe) {
        displayName = identity!.displayName;
        avatarUrl = identity!.avatarUrl ?? undefined;
        avatarAddress = conversation.peerAddress;
    } else {
        displayName = peerHandle || truncateAddress(conversation.peerAddress);
        avatarAddress = conversation.peerAddress;
    }

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all ${isSelected
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
                }`}
        >
            {/* Avatar */}
            <div className="relative">
                <LiquidGlassAvatar
                    address={avatarAddress}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    size="lg"
                    animate={false}
                    showInitial={true}
                />
                {/* Group indicator badge */}
                {isGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-white">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 truncate">
                        {displayName}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(conversation.lastMessageTime)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate pr-2">
                        {conversation.lastMessage || (isGroup ? `${conversation.memberCount || 0} members` : 'No messages yet')}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                    )}
                    {isPinned && conversation.unreadCount === 0 && (
                        <svg className="w-4 h-4 text-gray-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                    )}
                </div>
            </div>
        </button>
    );
}
