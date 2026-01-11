/**
 * Identity Setup - Onboarding Step for User Identity
 * 
 * Premium UI for setting display name and avatar.
 * Features:
 * - Display name input with character limit
 * - Shuffle button for playful handle generation
 * - Liquid Glass avatar preview
 * - Continue button to proceed
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { generateShuffleHandle } from '@/lib/UsernameGenerator';
import { useIdentityStore, createIdentity } from '@/store/identityStore';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { triggerHaptic, hapticSuccess } from '@/lib/haptics';
import { ShimmerButtonSimple } from '@/components/ui/shimmer-button-simple';

interface IdentitySetupProps {
    walletAddress: string;
    onComplete: () => void;
}

const MAX_NAME_LENGTH = 24;

export function IdentitySetup({ walletAddress, onComplete }: IdentitySetupProps) {
    const { setIdentity } = useIdentityStore();
    const { connect, isConnecting, isConnected } = useSecureXMTP();
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [hasEdited, setHasEdited] = useState(false);
    const [isEnablingXMTP, setIsEnablingXMTP] = useState(false);

    // Generate initial shuffle handle on mount
    useEffect(() => {
        if (!hasEdited) {
            const initialHandle = generateShuffleHandle(false);
            setDisplayName(initialHandle);
        }
    }, [hasEdited]);

    const handleShuffle = () => {
        triggerHaptic('light');
        setIsShuffling(true);

        // Quick shuffle animation
        let count = 0;
        const interval = setInterval(() => {
            setDisplayName(generateShuffleHandle(false));
            count++;
            if (count >= 5) {
                clearInterval(interval);
                setIsShuffling(false);
            }
        }, 80);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.slice(0, MAX_NAME_LENGTH);
        setDisplayName(value);
        setHasEdited(true);
    };

    const handleContinue = async () => {
        if (!displayName.trim()) return;

        triggerHaptic('medium');
        setIsEnablingXMTP(true);

        // Create and store identity with optional avatar
        const identity = createIdentity(walletAddress, displayName.trim());
        if (avatarUrl) {
            identity.avatarUrl = avatarUrl;
            identity.avatarType = 'custom';
        }
        setIdentity(identity);

        // Enable XMTP for this wallet by connecting
        // This will prompt the user to sign the XMTP identity creation message
        // which registers their wallet on the XMTP network
        try {
            if (!isConnected) {
                await connect();
            }
            hapticSuccess();
            onComplete();
        } catch (error) {
            console.error('[IdentitySetup] XMTP enablement error:', error);
            // Still proceed even if XMTP fails - they can retry later
            hapticSuccess();
            onComplete();
        } finally {
            setIsEnablingXMTP(false);
        }
    };

    const isValid = displayName.trim().length >= 2;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center"
        >
            {/* Header */}
            <motion.h1
                className="text-2xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                Create Your Identity
            </motion.h1>
            <motion.p
                className="text-gray-500 text-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                Choose how you'll appear to others
            </motion.p>

            {/* Avatar Upload */}
            <motion.div
                className="mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            >
                <AvatarUpload
                    currentAvatarUrl={avatarUrl}
                    walletAddress={walletAddress}
                    displayName={displayName}
                    onUpload={(imageDataUrl) => setAvatarUrl(imageDataUrl)}
                    onRemove={() => setAvatarUrl(null)}
                    size="2xl"
                />
                <p className="text-gray-400 text-xs text-center mt-2">Tap to add a photo</p>
            </motion.div>

            {/* Display Name Input */}
            <motion.div
                className="w-full mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={displayName}
                        onChange={handleInputChange}
                        placeholder="Enter your name..."
                        maxLength={MAX_NAME_LENGTH}
                        className="w-full px-4 py-3 pr-16 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:bg-white transition-all text-center text-lg font-medium"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <span className="text-xs text-gray-400">
                            {displayName.length}/{MAX_NAME_LENGTH}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Shuffle Button */}
            <motion.button
                onClick={handleShuffle}
                disabled={isShuffling}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors mb-8 disabled:opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <AnimatePresence mode="wait">
                    {isShuffling ? (
                        <motion.div
                            key="spinning"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </motion.div>
                    ) : (
                        <motion.svg
                            key="dice"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </motion.svg>
                    )}
                </AnimatePresence>
                Shuffle
            </motion.button>

            {/* Continue Button */}
            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <ShimmerButtonSimple
                    onClick={handleContinue}
                    disabled={!isValid || isEnablingXMTP || isConnecting}
                    className="w-full"
                >
                    {isEnablingXMTP || isConnecting ? (
                        <span className="flex items-center gap-2">
                            <motion.div
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            Enabling XMTP...
                        </span>
                    ) : (
                        'Continue'
                    )}
                </ShimmerButtonSimple>
            </motion.div>

            {/* Wallet Address Display */}
            <motion.p
                className="text-gray-400 text-xs text-center mt-6 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
            >
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </motion.p>

            {/* Info Note */}
            <motion.p
                className="text-gray-400 text-xs text-center mt-2 flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You can change this anytime in Settings
            </motion.p>
        </motion.div>
    );
}
