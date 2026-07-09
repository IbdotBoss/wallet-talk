/**
 * MessageRequestCard - Card for displaying pending message requests
 * Refactored for Tailwind CSS + Light Mode + ReactBits animation style
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ShieldAlert, User, Users } from 'lucide-react';
import type { Conversation } from '@/store/messageStore';
import { LiquidGlassAvatar } from '@/components/ui/LiquidGlassAvatar';

interface MessageRequestCardProps {
    conversation: Conversation;
    onAccept: (conversationId: string) => void;
    onBlock: (conversationId: string) => void;
    isLoading?: boolean;
}

export const MessageRequestCard: React.FC<MessageRequestCardProps> = ({
    conversation,
    onAccept,
    onBlock,
    isLoading = false,
}) => {
    const [action, setAction] = useState<'accept' | 'block' | null>(null);

    const handleAccept = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAction('accept');
        onAccept(conversation.topic);
    };

    const handleBlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAction('block');
        onBlock(conversation.topic);
    };

    const truncateAddress = (address: string) => {
        if (!address) return 'Unknown';
        if (address.length <= 12) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const isGroup = conversation.type === 'group';
    const displayName = isGroup
        ? conversation.groupName || 'Group Chat'
        : truncateAddress(conversation.peerAddress || conversation.peerInboxId || '');

    // For LiquidGlassAvatar
    const avatarAddress = isGroup
        ? conversation.topic
        : (conversation.peerAddress || conversation.peerInboxId || conversation.topic);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
                opacity: 0,
                scale: 0.95,
                height: 0,
                marginBottom: 0,
                transition: { duration: 0.2 }
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="group relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <LiquidGlassAvatar
                        address={avatarAddress}
                        size="md"
                        displayName={displayName}
                        avatarUrl={isGroup ? conversation.groupImageUrl : undefined}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate pr-2">
                            {displayName}
                        </h3>
                        <span className={`
                            px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full
                            ${isGroup
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                : 'bg-blue-50 text-blue-600 border border-blue-100'}
                        `}>
                            {isGroup ? 'Group' : 'DM'}
                        </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        {isGroup ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {isGroup
                            ? `${conversation.memberCount || 0} members`
                            : 'Wants to message you'
                        }
                    </p>

                    {/* Message Preview */}
                    {conversation.lastMessage && (
                        <div className="mb-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">
                            "{conversation.lastMessage}"
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleAccept}
                            disabled={isLoading}
                            className={`
                                flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
                                ${isLoading && action === 'accept'
                                    ? 'bg-indigo-100 text-indigo-400 cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow active:scale-[0.98]'}
                            `}
                        >
                            {isLoading && action === 'accept' ? (
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Accept
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleBlock}
                            disabled={isLoading}
                            className={`
                                flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all border outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400
                                ${isLoading && action === 'block'
                                    ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-wait'
                                    : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 active:scale-[0.98]'}
                            `}
                        >
                            {isLoading && action === 'block' ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <ShieldAlert className="w-4 h-4" />
                                    Block
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MessageRequestCard;
