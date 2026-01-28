/**
 * Onboarding Page - Create Identity or Connect Wallet
 * 
 * Clean Apple-style aesthetics with smooth animations.
 * White theme with physics-based cursor attractor background.
 * No social logins - Passkeys/Wallets only.
 * 
 * Flow: Login → Identity Setup → Messages
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { triggerHaptic } from '@/lib/haptics';
import { ShimmerButtonSimple } from '@/components/ui/shimmer-button-simple';
import { CursorBorderButton } from '@/components/ui/cursor-border-button';
import TextCursorProximity from '@/components/ui/text-cursor-proximity';
import { EncryptedText } from '@/components/ui/encrypted-text';
import Gravity, { MatterBody } from '@/components/fancy/physics/cursor-attractor-and-gravity';
import { IdentitySetup } from '@/components/onboarding/IdentitySetup';
import { useIdentityStore } from '@/store/identityStore';
import LogoImage from '@/assets/wallet-talk-logo.png';

type OnboardingStep = 'login' | 'identity';

export function Onboarding() {
    const navigate = useNavigate();
    const { login, authenticated, user } = usePrivy();
    const { wallets, ready: walletsReady } = useWallets();
    const { identity } = useIdentityStore();
    const [step, setStep] = useState<OnboardingStep>('login');
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Check if user is already set up
    useEffect(() => {
        if (authenticated) {
            // For passkey users, wallet might not be immediately available
            // Check if user has any linked accounts or wallets
            const walletAddress = wallets?.[0]?.address;

            if (walletAddress) {
                // User has a wallet address
                if (identity && identity.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
                    // User has completed identity setup, go to messages
                    navigate('/messages');
                } else {
                    // User is authenticated but needs identity setup
                    setStep('identity');
                    setIsCreating(false); // Reset spinner
                }
            } else if (user?.linkedAccounts && user.linkedAccounts.length > 0) {
                // User is authenticated via passkey but wallet not ready yet
                // Passkey users get an embedded wallet created automatically,
                // so show identity step - the wallet will be available soon
                setStep('identity');
                setIsCreating(false);
            }
            // If authenticated but no wallet yet, stay on login screen briefly
            // The wallet should initialize shortly for passkey users
        }
    }, [authenticated, user, identity, navigate, wallets]);

    // Reset creating state when auth changes
    useEffect(() => {
        if (authenticated) {
            setIsCreating(false);
        }
    }, [authenticated]);

    const handleCreateIdentity = async () => {
        // Don't call login if already authenticated
        if (authenticated) {
            setStep('identity');
            return;
        }

        triggerHaptic('medium');
        setIsCreating(true);
        try {
            await login();
        } catch (err) {
            console.error('Login error:', err);
            setIsCreating(false);
        }
    };

    const handleConnect = async () => {
        // Don't call login if already authenticated
        if (authenticated) {
            setStep('identity');
            return;
        }

        triggerHaptic('light');
        try {
            await login();
        } catch (err) {
            console.error('Connect error:', err);
            // User cancelled or error
        }
    };

    const handleIdentityComplete = () => {
        triggerHaptic('medium');
        navigate('/messages');
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-white relative"
        >
            {/* Physics-based Cursor Attractor Background */}
            <Gravity
                attractorStrength={0.0}
                cursorStrength={0.0004}
                cursorFieldRadius={200}
                className="w-full h-full z-0 absolute inset-0"
            >
                {[...Array(120)].map((_, i) => {
                    const size = Math.max(15, Math.random() * 35);
                    return (
                        <MatterBody
                            key={i}
                            matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                            x={`${Math.random() * 100}%`}
                            y={`${Math.random() * 100}%`}
                        >
                            <div
                                className="rounded-full bg-[#e5e7eb]"
                                style={{
                                    width: `${size}px`,
                                    height: `${size}px`,
                                }}
                            />
                        </MatterBody>
                    );
                })}
            </Gravity>

            <AnimatePresence mode="wait">
                {step === 'login' ? (
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
                            className="w-20 h-20 flex items-center justify-center mb-8"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <img
                                src={LogoImage}
                                alt="Wallet Talk Logo"
                                className="w-full h-full object-contain"
                            />
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
                                className="text-4xl font-bold text-gray-900 tracking-tight"
                                radius={120}
                                falloff="gaussian"
                                styles={{}}
                            >
                                Wallet Talk
                            </TextCursorProximity>
                        </motion.div>

                        {/* Encrypted scrambling subtitle */}
                        <motion.div
                            className="text-gray-500 text-center mb-12 text-lg h-7"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <EncryptedText
                                text="Secure, decentralized messaging."
                                encryptedClassName="text-gray-400"
                                revealedClassName="text-gray-500"
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
                            {/* Create Identity - Premium Button with hover effects */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
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
                            </motion.div>

                            {/* Connect Wallet - Cursor Border Button */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
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
                        </motion.div>

                        {/* Footer */}
                        <motion.p
                            className="text-gray-400 text-xs text-center mt-12"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            Powered by XMTP • End-to-end encrypted
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="identity"
                        className="relative z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {walletsReady && wallets.length > 0 ? (
                            <IdentitySetup
                                walletAddress={wallets[0]?.address || ''}
                                onComplete={handleIdentityComplete}
                            />
                        ) : (
                            // Loading state while wallet initializes
                            <div className="flex flex-col items-center justify-center">
                                <motion.div
                                    className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                <p className="text-gray-500 mt-4">Setting up your wallet...</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
