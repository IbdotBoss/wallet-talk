/**
 * Empty Chat State - Shown when no conversation is selected
 */

import { motion } from 'motion/react';

export function EmptyChatState() {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center max-w-sm"
            >
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                </h3>
                <p className="text-gray-500 text-sm">
                    Choose a chat from the sidebar to start messaging, or create a new conversation.
                </p>
            </motion.div>
        </div>
    );
}
