/**
 * Messaging Layout - 2-Column Layout for Desktop
 * 
 * Left Panel: Conversations sidebar (320px)
 * Right Panel: Active chat or empty state (fluid)
 * 
 * Responsive: Desktop shows both, Mobile shows one at a time
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationsSidebar } from '@/components/messaging/ConversationsSidebar';
import { ChatPanel } from '@/components/messaging/ChatPanel';
import { EmptyChatState } from '@/components/messaging/EmptyChatState';

export function MessagingLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { address } = useParams<{ address?: string }>();
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle selecting a conversation
    const handleSelectConversation = (peerAddress: string) => {
        navigate(`/messages/${peerAddress}`);
    };

    // Handle back navigation (mobile)
    const handleBack = () => {
        navigate('/messages');
    };

    // Mobile: Show only sidebar or chat based on route
    if (isMobile) {
        if (address) {
            return <ChatPanel address={address} onBack={handleBack} />;
        }
        return (
            <ConversationsSidebar
                onSelectConversation={handleSelectConversation}
                selectedAddress={undefined}
            />
        );
    }

    // Desktop: Show both panels
    return (
        <div className="h-screen flex bg-gray-50">
            {/* Left Sidebar - Fixed width */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
                <ConversationsSidebar
                    onSelectConversation={handleSelectConversation}
                    selectedAddress={address}
                />
            </div>

            {/* Right Panel - Fluid width */}
            <div className="flex-1 bg-white">
                <AnimatePresence mode="wait">
                    {address ? (
                        <motion.div
                            key={address}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <ChatPanel address={address} onBack={handleBack} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <EmptyChatState />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
