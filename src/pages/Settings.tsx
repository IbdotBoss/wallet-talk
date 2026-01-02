/**
 * Settings Page - Profile, wallet management, and app settings
 * 
 * "Escape Hatch" for embedded wallet export.
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

    const embeddedWallet = wallets?.find((w) => w.walletClientType === 'privy');
    const externalWallet = wallets?.find((w) => w.walletClientType !== 'privy');
    const userHandle = user?.wallet?.address
        ? getHandleForAddress(user.wallet.address)
        : null;

    const handleBack = () => {
        triggerHaptic('light');
        navigate('/conversations');
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

    const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div className="mb-6">
            <h2 className="text-text-muted text-sm font-medium mb-3 px-1">{title}</h2>
            <div className="glass-card divide-y divide-border">{children}</div>
        </div>
    );

    const SettingsRow = ({
        label,
        value,
        action,
        actionLabel,
        danger
    }: {
        label: string;
        value?: string;
        action?: () => void;
        actionLabel?: string;
        danger?: boolean;
    }) => (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
                <span className={`text-sm ${danger ? 'text-error' : 'text-text-primary'}`}>{label}</span>
                {value && <p className="text-text-muted text-xs truncate mt-0.5">{value}</p>}
            </div>
            {action && (
                <button
                    onClick={action}
                    className={`text-sm font-medium ${danger ? 'text-error' : 'text-accent'} hover:opacity-80 transition-opacity`}
                >
                    {actionLabel || 'Edit'}
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background safe-top safe-bottom">
            {/* Header */}
            <motion.header
                className="header border-b border-border"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 max-w-2xl mx-auto">
                    <button
                        onClick={handleBack}
                        className="btn-icon flex-shrink-0"
                        aria-label="Back"
                    >
                        <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
                </div>
            </motion.header>

            <div className="px-4 py-6 max-w-2xl mx-auto">
                {/* Profile */}
                <SettingsSection title="PROFILE">
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                            <span className="text-white text-2xl font-semibold">
                                {userHandle ? userHandle[1].toUpperCase() : '?'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold text-text-primary">{userHandle || 'Loading...'}</p>
                            <p className="text-text-muted text-sm truncate">
                                {user?.wallet?.address ? truncateAddress(user.wallet.address) : ''}
                            </p>
                            <p className="text-text-muted text-xs flex items-center gap-1 mt-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Username is a local alias only
                            </p>
                        </div>
                    </div>
                </SettingsSection>

                {/* Wallet */}
                <SettingsSection title="WALLET">
                    {embeddedWallet && (
                        <SettingsRow
                            label="Embedded Wallet"
                            value={truncateAddress(embeddedWallet.address)}
                            action={() => setShowExportConfirm(true)}
                            actionLabel="Export"
                        />
                    )}
                    {externalWallet && (
                        <SettingsRow
                            label="External Wallet"
                            value={`${externalWallet.walletClientType} • ${truncateAddress(externalWallet.address)}`}
                        />
                    )}
                </SettingsSection>

                {/* Blocked Users */}
                {blockedAddresses.length > 0 && (
                    <SettingsSection title="BLOCKED USERS">
                        {blockedAddresses.map((address) => (
                            <SettingsRow
                                key={address}
                                label={getHandleForAddress(address) || truncateAddress(address)}
                                value={getHandleForAddress(address) ? truncateAddress(address) : undefined}
                                action={() => handleUnblock(address)}
                                actionLabel="Unblock"
                            />
                        ))}
                    </SettingsSection>
                )}

                {/* Data */}
                <SettingsSection title="DATA">
                    <SettingsRow
                        label="Clear All Data"
                        value="Clears message cache, usernames, and blocklist"
                        action={() => setShowClearConfirm(true)}
                        actionLabel="Clear"
                        danger
                    />
                </SettingsSection>

                {/* Logout */}
                <motion.button
                    onClick={handleLogout}
                    className="w-full glass-card py-4 text-center text-error font-medium"
                    whileTap={{ scale: 0.98 }}
                >
                    Sign Out
                </motion.button>

                {/* Version */}
                <p className="text-text-muted text-xs text-center mt-8">
                    Antigravity v0.1.0 • XMTP Powered
                </p>
            </div>

            {/* Export Wallet Modal */}
            <AnimatePresence>
                {showExportConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowExportConfirm(false)}
                    >
                        <motion.div
                            className="w-full max-w-md glass-card p-6 mb-safe"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-text-primary mb-2">Export Private Key</h3>
                                <p className="text-text-secondary text-sm">
                                    You will need to re-authenticate with your passkey. Never share your private key with anyone.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleExportWallet}
                                    disabled={isExporting}
                                    className="btn-primary w-full py-4 flex items-center justify-center gap-2"
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
                                    className="btn-secondary w-full py-4"
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
                        className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <motion.div
                            className="w-full max-w-md glass-card p-6 mb-safe"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-text-primary mb-2">Clear All Data</h3>
                                <p className="text-text-secondary text-sm">
                                    This will delete your local message cache, username mappings, and blocklist. This cannot be undone.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleClearData}
                                    className="w-full py-4 rounded-xl bg-error text-white font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Clear Data
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="btn-secondary w-full py-4"
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
