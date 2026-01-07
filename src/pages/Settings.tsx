/**
 * Settings Page - Premium fintech-style settings
 * 
 * White theme with modern card design.
 * Integrated with identityStore for editable display name.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { truncateAddress } from '@/lib/SecurityService';
import { getBlockedAddresses, removeFromBlocklist, clearBlocklist } from '@/lib/BlocklistService';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { clearAllLimits } from '@/lib/RateLimiter';
import { useMessageStore } from '@/store/messageStore';
import { useIdentityStore, createIdentity } from '@/store/identityStore';
import { generateShuffleHandle } from '@/lib/UsernameGenerator';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { LiquidGlassAvatar } from '@/components/ui/LiquidGlassAvatar';

export function Settings() {
    const navigate = useNavigate();
    const { logout, user, exportWallet } = usePrivy();
    const { wallets } = useWallets();
    const { clearAll: clearMessages } = useMessageStore();
    const { identity, updateDisplayName, updateAvatar, setIdentity } = useIdentityStore();

    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [blockedAddresses, setBlockedAddresses] = useState(getBlockedAddresses());
    const [copiedAddress, setCopiedAddress] = useState(false);

    // Editing state for display name
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(identity?.displayName || '');

    const embeddedWallet = wallets?.find((w) => w.walletClientType === 'privy');
    const externalWallet = wallets?.find((w) => w.walletClientType !== 'privy');

    // Use identity store for display name, fallback to truncated address
    const displayName = identity?.displayName || (user?.wallet?.address ? truncateAddress(user.wallet.address) : 'Loading...');

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
        localStorage.removeItem('antigravity-identity');
        hapticSuccess();
        setShowClearConfirm(false);
    };

    const handleLogout = async () => {
        triggerHaptic('medium');
        await logout();
        navigate('/');
    };

    const handleEditName = () => {
        setEditedName(identity?.displayName || '');
        setIsEditingName(true);
        triggerHaptic('light');
    };

    const handleSaveName = () => {
        if (editedName.trim().length >= 2) {
            // If no identity exists, create one first
            if (!identity && user?.wallet?.address) {
                const newIdentity = createIdentity(user.wallet.address, editedName.trim());
                setIdentity(newIdentity);
            } else {
                updateDisplayName(editedName.trim());
            }
            hapticSuccess();
        }
        setIsEditingName(false);
    };

    const handleCancelEdit = () => {
        setEditedName(identity?.displayName || '');
        setIsEditingName(false);
    };

    const handleShuffleName = () => {
        triggerHaptic('light');
        const newName = generateShuffleHandle(false);
        setEditedName(newName);
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
                            {/* Uploadable Avatar */}
                            {user?.wallet?.address && (
                                <AvatarUpload
                                    currentAvatarUrl={identity?.avatarUrl || null}
                                    walletAddress={user.wallet.address}
                                    displayName={identity?.displayName}
                                    onUpload={(imageDataUrl) => {
                                        // If no identity exists, create one first
                                        if (!identity && user?.wallet?.address) {
                                            const newIdentity = createIdentity(user.wallet.address, displayName);
                                            newIdentity.avatarUrl = imageDataUrl;
                                            newIdentity.avatarType = 'custom';
                                            setIdentity(newIdentity);
                                        } else {
                                            updateAvatar(imageDataUrl, 'custom');
                                        }
                                    }}
                                    onRemove={() => updateAvatar(null, 'generative')}
                                    size="xl"
                                />
                            )}

                            <div className="flex-1 min-w-0">
                                {/* Editable Display Name */}
                                <AnimatePresence mode="wait">
                                    {isEditingName ? (
                                        <motion.div
                                            key="editing"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value.slice(0, 24))}
                                                    className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-black focus:bg-white transition-all"
                                                    placeholder="Display name..."
                                                    autoFocus
                                                    maxLength={24}
                                                />
                                                <button
                                                    onClick={handleShuffleName}
                                                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                                    title="Shuffle name"
                                                >
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSaveName}
                                                    disabled={editedName.trim().length < 2}
                                                    className="px-3 py-1.5 text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 rounded-lg transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="display"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                                                <button
                                                    onClick={handleEditName}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="Edit name"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
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
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-start gap-2">
                            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                                Your display name is stored locally. Tap the pencil icon to change it anytime.
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
                                        <LiquidGlassAvatar
                                            address={address}
                                            size="md"
                                            animate={false}
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {truncateAddress(address)}
                                            </p>
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

                {/* Privacy & Security */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Privacy & Security</h3>
                    </div>

                    <div className="divide-y divide-gray-100">
                        <div className="px-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">End-to-End Encryption</p>
                                <p className="text-sm text-gray-500">All messages are encrypted with XMTP</p>
                            </div>
                            <div className="px-2 py-1 bg-green-100 rounded-full">
                                <span className="text-xs font-medium text-green-700">Active</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-red-600">Clear All Data</p>
                                <p className="text-sm text-gray-500">Messages, blocked users, identity</p>
                            </div>
                        </button>
                    </div>
                </motion.div>

                {/* Logout */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 text-center text-red-600 font-semibold bg-white rounded-2xl shadow-sm hover:bg-red-50 transition-colors"
                    >
                        Sign Out
                    </button>
                </motion.div>

                {/* Footer */}
                <motion.div
                    className="text-center py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                >
                    <p className="text-gray-400 text-xs">Wallet Talk v1.0</p>
                    <p className="text-gray-400 text-xs mt-1">Powered by XMTP • End-to-end encrypted</p>
                </motion.div>
            </div>

            {/* Export Wallet Confirmation Modal */}
            <AnimatePresence>
                {showExportConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Export Wallet</h3>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                This will reveal your private key. Never share it with anyone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExportConfirm(false)}
                                    className="flex-1 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExportWallet}
                                    disabled={isExporting}
                                    className="flex-1 py-3 rounded-xl font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                >
                                    {isExporting ? 'Exporting...' : 'Export'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear Data Confirmation Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Clear All Data?</h3>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                This will delete all messages, blocked users, and your identity. This cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearData}
                                    className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
