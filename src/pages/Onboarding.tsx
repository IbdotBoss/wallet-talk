/**
 * Onboarding Page - Create Identity or Connect Wallet
 * 
 * Clean Apple-style aesthetics with smooth animations.
 * No social logins - Passkeys/Wallets only.
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { triggerHaptic, hapticSuccess } from '@/lib/haptics';
import { registerHandle, getHandleForAddress } from '@/lib/UsernameGenerator';
import { identityRateLimiter } from '@/lib/RateLimiter';
import { ShimmerButtonSimple } from '@/components/ui/shimmer-button-simple';
import { CursorBorderButton } from '@/components/ui/cursor-border-button';
import TextCursorProximity from '@/components/ui/text-cursor-proximity';
import { EncryptedText } from '@/components/ui/encrypted-text';

export function Onboarding() {
    const navigate = useNavigate();
    const { login, authenticated, user } = usePrivy();
    const [showHandle, setShowHandle] = useState(false);
    const [generatedHandle, setGeneratedHandle] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Redirect if already authenticated
    useEffect(() => {
        if (authenticated && user?.wallet?.address) {
            const existingHandle = getHandleForAddress(user.wallet.address);
            if (existingHandle) {
                navigate('/conversations');
            } else {
                // Generate handle for new user
                if (identityRateLimiter.check(user.id)) {
                    const handle = registerHandle(user.wallet.address);
                    identityRateLimiter.attempt(user.id);
                    setGeneratedHandle(handle);
                    setShowHandle(true);
                    hapticSuccess();
                }
            }
        }
    }, [authenticated, user, navigate]);

    const handleCreateIdentity = async () => {
        triggerHaptic('medium');
        setIsCreating(true);
        try {
            await login();
        } catch {
            setIsCreating(false);
        }
    };

    const handleConnect = async () => {
        triggerHaptic('light');
        try {
            await login();
        } catch {
            // User cancelled
        }
    };

    const handleContinue = () => {
        triggerHaptic('medium');
        navigate('/conversations');
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-black"
        >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />

            {/* Soft glow orb */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15"
                style={{
                    background: 'radial-gradient(circle, rgba(0,122,255,0.4) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />

            <AnimatePresence mode="wait">
                {!showHandle ? (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 w-full max-w-sm flex flex-col items-center"
                    >
                        {/* Logo */}
                        <motion.div
                            className="w-20 h-20 rounded-[22px] bg-[#007AFF] flex items-center justify-center mb-8"
                            style={{
                                boxShadow: '0 0 60px rgba(0, 122, 255, 0.4)',
                            }}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <svg
                                className="w-10 h-10 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                                />
                            </svg>
                        </motion.div>

                        {/* Title with cursor proximity blur effect */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-3"
                        >
                            <TextCursorProximity
                                containerRef={containerRef}
                                className="text-4xl font-bold text-white tracking-tight"
                                radius={120}
                                falloff="gaussian"
                                styles={{}}
                            >
                                Wallet Talk
                            </TextCursorProximity>
                        </motion.div>

                        {/* Encrypted scrambling subtitle */}
                        <motion.div
                            className="text-[#8e8e93] text-center mb-12 text-lg h-7"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <EncryptedText
                                text="Secure, decentralized messaging."
                                encryptedClassName="text-[#48484a]"
                                revealedClassName="text-[#8e8e93]"
                                revealDelayMs={40}
                                flipDelayMs={30}
                                continuous={true}
                                pauseMs={3000}
                            />
                        </motion.div>

                        {/* Buttons */}
                        <motion.div
                            className="w-full space-y-4 flex flex-col items-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {/* Create Identity - Simple Shimmer Button */}
                            <ShimmerButtonSimple
                                onClick={handleCreateIdentity}
                                className="w-full max-w-xs"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <motion.div
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                        </svg>
                                        Create Identity
                                    </>
                                )}
                            </ShimmerButtonSimple>

                            {/* Connect Wallet - Cursor Border Button */}
                            <CursorBorderButton
                                onClick={handleConnect}
                                className="w-full max-w-xs"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Connect Wallet
                            </CursorBorderButton>
                        </motion.div>

                        {/* Footer */}
                        <motion.p
                            className="text-[#48484a] text-xs text-center mt-12"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            Powered by XMTP • End-to-end encrypted
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="handle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative z-10 w-full max-w-sm flex flex-col items-center"
                    >
                        {/* Success animation */}
                        <motion.div
                            className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
                            style={{
                                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                                boxShadow: '0 0 40px rgba(52, 199, 89, 0.3)',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                        >
                            <motion.svg
                                className="w-12 h-12 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                        </motion.div>

                        <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>
                        <p className="text-[#8e8e93] text-center mb-6">Your identity has been created.</p>

                        {/* Handle display */}
                        <motion.div
                            className="glass-card px-8 py-6 mb-8 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <p className="text-[#48484a] text-sm mb-2">Your Handle</p>
                            <p className="text-3xl font-bold text-[#007AFF]">{generatedHandle}</p>
                            <p className="text-[#48484a] text-xs mt-3 flex items-center justify-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Local alias only
                            </p>
                        </motion.div>

                        <ShimmerButtonSimple
                            onClick={handleContinue}
                            className="w-full max-w-xs"
                        >
                            Start Chatting
                        </ShimmerButtonSimple>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
