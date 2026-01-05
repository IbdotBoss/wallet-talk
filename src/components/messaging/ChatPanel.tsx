/**
 * Chat Panel - Right panel in 2-column layout
 * 
 * Features:
 * - Header with avatar, name, status
 * - Message bubbles (dark sent, light received)
 * - Input bar with send button
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress, validateMessageLength } from '@/lib/SecurityService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { addToBlocklist, isBlocked } from '@/lib/BlocklistService';
import { messageRateLimiter } from '@/lib/RateLimiter';

interface ChatPanelProps {
    address: string;
    onBack?: () => void;
}

export function ChatPanel({ address, onBack }: ChatPanelProps) {
    const { user } = usePrivy();
    const { sendMessage, isConnected } = useSecureXMTP();
    const { messages, markAsRead, conversations } = useMessageStore();

    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Find conversation for this peer
    const conversation = conversations.find(
        (c) => c.peerAddress.toLowerCase() === address?.toLowerCase()
    );
    const chatMessages = conversation ? messages.get(conversation.topic) || [] : [];

    const peerHandle = address ? getHandleForAddress(address) : null;
    const displayName = peerHandle || truncateAddress(address || '');
    const isAddressBlocked = address ? isBlocked(address) : false;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Mark as read when opening
    useEffect(() => {
        if (conversation?.topic) {
            markAsRead(conversation.topic);
        }
    }, [conversation?.topic, markAsRead]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    };

    const handleSend = async () => {
        if (!address || !inputValue.trim() || isSending || !isConnected) return;

        if (!validateMessageLength(inputValue.trim())) {
            hapticError();
            return;
        }

        const remaining = messageRateLimiter.remaining(user?.id);
        if (remaining <= 0) {
            hapticError();
            return;
        }

        triggerHaptic('medium');
        setIsSending(true);

        const success = await sendMessage(address, inputValue.trim());

        if (success) {
            hapticSuccess();
            setInputValue('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        } else {
            hapticError();
        }

        setIsSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleBlock = () => {
        if (!address) return;
        triggerHaptic('heavy');
        addToBlocklist(address);
        setShowActions(false);
        onBack?.();
    };

    const formatMessageTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSeparator = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const shouldShowDateSeparator = (index: number): boolean => {
        if (index === 0) return true;
        const current = chatMessages[index].timestamp;
        const previous = chatMessages[index - 1].timestamp;
        return current.toDateString() !== previous.toDateString();
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                {/* Back button (mobile) */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="md:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                        aria-label="Back"
                    >
                        <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">
                        {peerHandle ? peerHandle[1].toUpperCase() : (address?.[2] || '?').toUpperCase()}
                    </span>
                </div>

                {/* Name & Status */}
                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-xs text-gray-500">
                            {isConnected ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowActions(!showActions)}
                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                        aria-label="More options"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>

                    <AnimatePresence>
                        {showActions && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowActions(false)}
                                />
                                <motion.div
                                    className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] z-50"
                                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <button
                                        onClick={() => {
                                            navigator.clipboard?.writeText(address || '');
                                            setShowActions(false);
                                            triggerHaptic('light');
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy Address
                                    </button>
                                    <button
                                        onClick={handleBlock}
                                        className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        Block User
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {isAddressBlocked ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <p className="text-gray-500">This user is blocked</p>
                        </div>
                    </div>
                ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                    {peerHandle ? peerHandle[1].toUpperCase() : (address?.[2] || '?').toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Start chatting with {displayName}
                        </h3>
                        <p className="text-gray-500 text-sm max-w-xs">
                            Messages are end-to-end encrypted
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1 max-w-2xl mx-auto">
                        {chatMessages.map((message, index) => {
                            const isSent = message.isSent;
                            const showDate = shouldShowDateSeparator(index);

                            return (
                                <div key={message.id}>
                                    {showDate && (
                                        <div className="flex items-center justify-center py-4">
                                            <span className="px-3 py-1 rounded-full bg-white text-gray-500 text-xs shadow-sm">
                                                {formatDateSeparator(message.timestamp)}
                                            </span>
                                        </div>
                                    )}

                                    <motion.div
                                        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div
                                            className={`max-w-[75%] px-4 py-2.5 ${isSent
                                                    ? 'bg-gray-900 text-white rounded-2xl rounded-br-md'
                                                    : 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                {message.content}
                                            </p>
                                            <p className={`text-[10px] mt-1 ${isSent ? 'text-white/60' : 'text-gray-400'}`}>
                                                {formatMessageTime(message.timestamp)}
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-3 max-w-2xl mx-auto">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isConnected ? "Type your message..." : "Connecting..."}
                            rows={1}
                            className="w-full px-4 py-3 bg-gray-100 border-0 rounded-2xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-200 resize-none"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                            disabled={!isConnected || isAddressBlocked}
                        />
                    </div>

                    <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending || !isConnected || isAddressBlocked}
                        className="w-12 h-12 rounded-full bg-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Send message"
                    >
                        {isSending ? (
                            <motion.div
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
