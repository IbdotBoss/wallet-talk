/**
 * Chat Page - 1:1 messaging with a peer
 * 
 * Message bubbles with spring animations.
 * All content sanitized via SecurityService.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useMessageStore } from '@/store/messageStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP';
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
        navigate('/conversations');
    };

    const handleBack = () => {
        triggerHaptic('light');
        navigate('/conversations');
    };

    return (
        <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
            {/* Header */}
            <motion.header
                className="glass sticky top-0 z-20 px-4 py-3"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center transition-colors"
                    >
                        <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                        <span className="text-white font-semibold">
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

                    {/* Actions */}
                    <button
                        onClick={() => setShowActions(!showActions)}
                        className="w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                </div>

                {/* Actions dropdown */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            className="absolute right-4 top-full mt-2 glass-card py-2 min-w-[160px]"
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        >
                            <button
                                onClick={handleBlock}
                                className="w-full px-4 py-2 text-left text-error hover:bg-surface transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Block User
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {isAddressBlocked ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-text-muted">This user is blocked.</p>
                    </div>
                ) : chatMessages.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center h-full text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <p className="text-text-muted">Send a message to start the conversation</p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {chatMessages.map((message, index) => {
                            const isSent = message.isSent;
                            const showTimestamp = index === 0 ||
                                (chatMessages[index - 1] &&
                                    message.timestamp.getTime() - chatMessages[index - 1].timestamp.getTime() > 300000);

                            return (
                                <div key={message.id}>
                                    {showTimestamp && (
                                        <p className="text-center text-text-muted text-xs mb-3">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                    <motion.div
                                        className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    >
                                        <div
                                            className={`max-w-[75%] px-4 py-3 rounded-2xl ${isSent
                                                    ? 'bg-accent text-white rounded-br-md'
                                                    : 'glass rounded-bl-md'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {message.content}
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

            {/* Input */}
            <motion.div
                className="glass px-4 py-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            rows={1}
                            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 pr-12 text-text-primary placeholder:text-text-muted resize-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all max-h-32"
                            style={{ minHeight: '48px' }}
                            disabled={!isConnected || isAddressBlocked}
                        />
                        <span className="absolute right-3 bottom-3 text-text-muted text-xs">
                            {inputValue.length}/10000
                        </span>
                    </div>

                    <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending || !isConnected || isAddressBlocked}
                        className="w-12 h-12 rounded-full bg-accent flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
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
