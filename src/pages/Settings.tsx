/**
 * Settings Page - Premium fintech-style settings
 * 
 * White theme with modern card design
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getHandleForAddress } from '@/lib/UsernameGenerator';
import { truncateAddress } from '@/lib/SecurityService';
import { getBlockedAddresses, removeFromBlocklist, clearBlocklist } from '@/lib/BlocklistService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { clearAllLimits } from '@/lib/RateLimiter';
import { useMessageStore } from '@/store/messageStore';

export function Settings() {
    const navigate = useNavigate();
    const { logout, user, exportWallet } = usePrivy();
    const { wallets } = useWallets();
    const { clearAll: clearMessages } = useMessageStore();

    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [blockedAddresses, setBlockedAddresses] = useState(getBlockedAddresses());
    const [copiedAddress, setCopiedAddress] = useState(false);

    const embeddedWallet = wallets?.find((w) => w.walletClientType === 'privy');
    const externalWallet = wallets?.find((w) => w.walletClientType !== 'privy');
    const userHandle = user?.wallet?.address
        ? getHandleForAddress(user.wallet.address)
        : null;

    const handleBack = () => {
        triggerHaptic('light');
        navigate('/messages');
    };

    const handleCopyAddress = async () => {
        if (user?.wallet?.address) {
            await navigator.clipboard.writeText(user.wallet.address);
            setCopiedAddress(true);
            hapticSuccess();
            setTimeout(() => setCopiedAddress(false), 2000);
        }
    };

    const handleExportWallet = async () => {
        if (!embeddedWallet) return;

        triggerHaptic('heavy');
        setIsExporting(true);

        try {
            await exportWallet();
            hapticSuccess();
        } catch {
            hapticError();
        } finally {
            setIsExporting(false);
            setShowExportConfirm(false);
        }
    };

    const handleUnblock = (address: string) => {
        triggerHaptic('light');
        removeFromBlocklist(address);
        setBlockedAddresses(getBlockedAddresses());
        hapticSuccess();
    };

    const handleClearData = () => {
        triggerHaptic('heavy');
        clearMessages();
        clearBlocklist();
        clearAllLimits();
        localStorage.removeItem('antigravity_handles');
        hapticSuccess();
        setShowClearConfirm(false);
    };

    const handleLogout = async () => {
        triggerHaptic('medium');
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <motion.header
                className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="flex items-center gap-4 px-4 py-4 max-w-2xl mx-auto">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        aria-label="Back"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                </div>
            </motion.header>

            <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
                {/* Profile Card */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            {/* Avatar with gradient */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                                    <span className="text-white text-3xl font-bold">
                                        {userHandle ? userHandle[1]?.toUpperCase() : '?'}
                                    </span>
                                </div>
                                {/* Online indicator */}
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold text-gray-900">{userHandle || 'Loading...'}</h2>
                                <button
                                    onClick={handleCopyAddress}
                                    className="flex items-center gap-1.5 text-gray-500 text-sm mt-1 hover:text-gray-700 transition-colors"
                                >
                                    <span className="font-mono">
                                        {user?.wallet?.address ? truncateAddress(user.wallet.address) : ''}
                                    </span>
                                    {copiedAddress ? (
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-start gap-2">
                            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                                Your username is a local alias only and is not stored on-chain or shared with other users.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Wallet Section */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Wallet</h3>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {embeddedWallet && (
                            <div className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Embedded Wallet</p>
                                        <p className="text-sm text-gray-500 font-mono">{truncateAddress(embeddedWallet.address)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowExportConfirm(true)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Export
                                </button>
                            </div>
                        )}

                        {externalWallet && (
                            <div className="px-6 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 capitalize">{externalWallet.walletClientType}</p>
                                    <p className="text-sm text-gray-500 font-mono">{truncateAddress(externalWallet.address)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Blocked Users */}
                {blockedAddresses.length > 0 && (
                    <motion.div
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                Blocked Users ({blockedAddresses.length})
                            </h3>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {blockedAddresses.map((address) => (
                                <div key={address} className="px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-gray-500 font-medium">
                                                {(getHandleForAddress(address)?.[1] || address[2] || '?').toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {getHandleForAddress(address) || truncateAddress(address)}
                                            </p>
                                            {getHandleForAddress(address) && (
                                                <p className="text-sm text-gray-500 font-mono">{truncateAddress(address)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(address)}
                                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                    >
                                        Unblock
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Data Management */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Data</h3>
                    </div>

                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Clear All Data</p>
                                    <p className="text-sm text-gray-500">Messages, usernames, and blocklist</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Sign Out Button */}
                <motion.button
                    onClick={handleLogout}
                    className="w-full py-4 bg-white rounded-2xl shadow-sm text-red-500 font-semibold text-center hover:bg-red-50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileTap={{ scale: 0.98 }}
                >
                    Sign Out
                </motion.button>

                {/* Version */}
                <motion.p
                    className="text-gray-400 text-xs text-center pt-4 pb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                >
                    Antigravity v0.1.0 • XMTP Powered
                </motion.p>
            </div>

            {/* Export Wallet Modal */}
            <AnimatePresence>
                {showExportConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowExportConfirm(false)}
                    >
                        <motion.div
                            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Export Private Key</h3>
                                <p className="text-gray-500 text-sm">
                                    You will need to re-authenticate. Never share your private key with anyone.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleExportWallet}
                                    disabled={isExporting}
                                    className="w-full py-4 rounded-xl bg-black text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {isExporting ? (
                                        <motion.div
                                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                            </svg>
                                            Authenticate & Export
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowExportConfirm(false)}
                                    className="w-full py-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear Data Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <motion.div
                            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Data</h3>
                                <p className="text-gray-500 text-sm">
                                    This will delete your local message cache, username mappings, and blocklist. This cannot be undone.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleClearData}
                                    className="w-full py-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                                >
                                    Clear Data
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="w-full py-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
