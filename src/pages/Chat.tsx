/**
 * Chat Page - 1:1 messaging with a peer
 * 
 * Message bubbles with spring animations.
 * All content sanitized via SecurityService.
 * Responsive: Desktop centered / Mobile full-width
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress, validateMessageLength } from '@/lib/SecurityService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { addToBlocklist, isBlocked } from '@/lib/BlocklistService';
import { messageRateLimiter } from '@/lib/RateLimiter';

export function Chat() {
    const { address } = useParams<{ address: string }>();
    const navigate = useNavigate();
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

        // Auto-resize
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
        navigate('/messages');
    };

    const handleBack = () => {
        triggerHaptic('light');
        navigate('/messages');
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

    // Group messages by date
    const shouldShowDateSeparator = (index: number): boolean => {
        if (index === 0) return true;
        const current = chatMessages[index].timestamp;
        const previous = chatMessages[index - 1].timestamp;
        return current.toDateString() !== previous.toDateString();
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
                <div className="flex items-center gap-3 max-w-3xl mx-auto w-full">
                    <button
                        onClick={handleBack}
                        className="btn-icon flex-shrink-0"
                        aria-label="Back"
                    >
                        <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Avatar */}
                    <div className="avatar avatar-md flex-shrink-0">
                        <span>
                            {peerHandle ? peerHandle[1].toUpperCase() : (address?.[2] || '?').toUpperCase()}
                        </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-text-primary truncate">{displayName}</h1>
                        {peerHandle && (
                            <p className="text-text-muted text-xs truncate">{truncateAddress(address || '')}</p>
                        )}
                    </div>

                    {/* Connection status */}
                    <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full bg-surface">
                        <div className={`status-dot ${isConnected ? 'status-online' : 'status-offline'}`} />
                    </div>

                    {/* Actions */}
                    <div className="relative">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className="btn-icon"
                            aria-label="More options"
                        >
                            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>

                        {/* Actions dropdown */}
                        <AnimatePresence>
                            {showActions && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowActions(false)}
                                    />
                                    <motion.div
                                        className="absolute right-0 top-full mt-2 glass-card py-2 min-w-[180px] z-50"
                                        initial={{ opacity: 0, scale: 0.9, y: -10, rotateX: -15 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10, rotateX: -15 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 25,
                                        }}
                                    >
                                        <button
                                            onClick={() => {
                                                navigator.clipboard?.writeText(address || '');
                                                setShowActions(false);
                                                triggerHaptic('light');
                                            }}
                                            className="w-full px-4 py-3 text-left text-text-primary hover:bg-surface transition-colors flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy Address
                                        </button>
                                        <button
                                            onClick={handleBlock}
                                            className="w-full px-4 py-3 text-left text-error hover:bg-surface transition-colors flex items-center gap-3"
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
            </motion.header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    {isAddressBlocked ? (
                        <div className="flex items-center justify-center h-full py-20">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <p className="text-text-muted">This user is blocked</p>
                            </div>
                        </div>
                    ) : chatMessages.length === 0 ? (
                        <motion.div
                            className="flex flex-col items-center justify-center h-full py-20 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.6,
                                ease: [0.16, 1, 0.3, 1],
                                delay: 0.2,
                            }}
                        >
                            <motion.div
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center mb-6"
                                animate={{
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <div className="avatar avatar-lg">
                                    <span>
                                        {peerHandle ? peerHandle[1].toUpperCase() : (address?.[2] || '?').toUpperCase()}
                                    </span>
                                </div>
                            </motion.div>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">
                                Start chatting with {displayName}
                            </h3>
                            <p className="text-text-muted text-sm max-w-xs">
                                Messages are end-to-end encrypted. Only you and {peerHandle || 'this address'} can read them.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-1">
                            {chatMessages.map((message, index) => {
                                const isSent = message.isSent;
                                const showDate = shouldShowDateSeparator(index);
                                const showTime = index === 0 ||
                                    (chatMessages[index - 1] &&
                                        message.timestamp.getTime() - chatMessages[index - 1].timestamp.getTime() > 300000);

                                return (
                                    <div key={message.id}>
                                        {/* Date separator */}
                                        {showDate && (
                                            <div className="flex items-center justify-center py-4">
                                                <span className="px-3 py-1 rounded-full bg-surface text-text-muted text-xs">
                                                    {formatDateSeparator(message.timestamp)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Time separator */}
                                        {showTime && !showDate && (
                                            <p className="text-center text-text-muted text-xs py-3">
                                                {formatMessageTime(message.timestamp)}
                                            </p>
                                        )}

                                        {/* Message bubble */}
                                        <motion.div
                                            className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1`}
                                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 400,
                                                damping: 24,
                                                mass: 0.8,
                                            }}
                                        >
                                            <div
                                                className={`max-w-[80%] md:max-w-[65%] px-4 py-2.5 ${isSent ? 'bubble-sent' : 'bubble-received'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                    {message.content}
                                                </p>
                                                <p className={`text-[10px] mt-1 ${isSent ? 'text-white/60' : 'text-text-muted'}`}>
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
            </div>

            {/* Input */}
            <motion.div
                className="input-bar border-t border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
                <div className="max-w-3xl mx-auto flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isConnected ? "Message..." : "Connecting..."}
                            rows={1}
                            className="w-full pr-16 max-h-32"
                            style={{ minHeight: '48px' }}
                            disabled={!isConnected || isAddressBlocked}
                        />
                        <span className="absolute right-4 bottom-3 text-text-muted text-xs">
                            {inputValue.length > 0 && `${inputValue.length}/10000`}
                        </span>
                    </div>

                    <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending || !isConnected || isAddressBlocked}
                        className="w-12 h-12 rounded-full bg-accent flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        whileHover={{
                            scale: 1.08,
                            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.4)',
                        }}
                        whileTap={{ scale: 0.92 }}
                        transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 20,
                        }}
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
            </motion.div>
        </div>
    );
}
