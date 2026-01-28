/**
 * CreateGroupModal - Modal for creating new group chats
 * 
 * Features:
 * - Group name and image input
 * - Member selection with address validation
 * - XMTP reachability checking
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { validateAddress, truncateAddress } from '@/lib/SecurityService';
import { LiquidGlassAvatar } from '@/components/ui/LiquidGlassAvatar';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated?: (groupId: string) => void;
}

interface PendingMember {
    address: string;
    isReachable: boolean | null; // null = checking
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const { createGroup, checkCanMessage, isConnected } = useSecureXMTP();

    const [groupName, setGroupName] = useState('');
    const [memberInput, setMemberInput] = useState('');
    const [members, setMembers] = useState<PendingMember[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add a member to the list
    const handleAddMember = useCallback(async () => {
        const address = memberInput.trim();
        setError(null);

        if (!address) return;

        // Validate address format
        if (!validateAddress(address)) {
            setError('Invalid Ethereum address');
            hapticError();
            return;
        }

        // Check if already added
        if (members.some(m => m.address.toLowerCase() === address.toLowerCase())) {
            setError('This address is already added');
            return;
        }

        triggerHaptic('light');

        // Add with pending reachability status
        setMembers(prev => [...prev, { address, isReachable: null }]);
        setMemberInput('');

        // Check XMTP reachability
        try {
            const result = await checkCanMessage([address]);
            const isReachable = result.get(address.toLowerCase()) || false;

            setMembers(prev => prev.map(m =>
                m.address.toLowerCase() === address.toLowerCase()
                    ? { ...m, isReachable }
                    : m
            ));

            if (!isReachable) {
                setError(`${truncateAddress(address)} is not on XMTP yet`);
            }
        } catch (err) {
            setMembers(prev => prev.map(m =>
                m.address.toLowerCase() === address.toLowerCase()
                    ? { ...m, isReachable: false }
                    : m
            ));
        }
    }, [memberInput, members, checkCanMessage]);

    // Remove a member from the list
    const handleRemoveMember = useCallback((address: string) => {
        triggerHaptic('light');
        setMembers(prev => prev.filter(m => m.address.toLowerCase() !== address.toLowerCase()));
    }, []);

    // Create the group
    const handleCreateGroup = useCallback(async () => {
        setError(null);

        if (!groupName.trim()) {
            setError('Please enter a group name');
            hapticError();
            return;
        }

        const reachableMembers = members.filter(m => m.isReachable === true);
        if (reachableMembers.length === 0) {
            setError('Add at least one member who is on XMTP');
            hapticError();
            return;
        }

        setIsCreating(true);
        triggerHaptic('medium');

        try {
            const group = await createGroup(
                reachableMembers.map(m => m.address),
                { name: groupName.trim() }
            );

            if (group) {
                hapticSuccess();
                onGroupCreated?.(group.id);
                handleClose();
            } else {
                setError('Failed to create group');
                hapticError();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create group');
            hapticError();
        } finally {
            setIsCreating(false);
        }
    }, [groupName, members, createGroup, onGroupCreated]);

    // Close and reset
    const handleClose = useCallback(() => {
        setGroupName('');
        setMemberInput('');
        setMembers([]);
        setError(null);
        setIsCreating(false);
        onClose();
    }, [onClose]);

    // Handle Enter key in member input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddMember();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            >
                <motion.div
                    className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 font-sans">New Group</h2>
                                <p className="text-gray-500 text-sm mt-1">Create a group conversation</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-6 space-y-5">
                        {/* Group Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Enter group name..."
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-0 transition-all text-[15px]"
                                maxLength={50}
                            />
                        </div>

                        {/* Add Members */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Add Members
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={memberInput}
                                    onChange={(e) => setMemberInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Wallet address (0x...)"
                                    className="flex-1 px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-0 transition-all text-[15px]"
                                />
                                <button
                                    onClick={handleAddMember}
                                    disabled={!memberInput.trim()}
                                    className="px-5 py-4 bg-gradient-to-br from-gray-800 to-black text-white rounded-2xl font-medium disabled:opacity-30 hover:shadow-lg active:scale-[0.98] transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Member List */}
                        {members.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-sm text-gray-500">
                                    {members.length} member{members.length !== 1 ? 's' : ''} added
                                </span>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {members.map((member) => (
                                        <div
                                            key={member.address}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <LiquidGlassAvatar
                                                    address={member.address}
                                                    size="sm"
                                                    animate={false}
                                                />
                                                <div>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {truncateAddress(member.address)}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {member.isReachable === null ? (
                                                            <span className="text-xs text-gray-400">Checking...</span>
                                                        ) : member.isReachable ? (
                                                            <span className="text-xs text-green-500">✓ On XMTP</span>
                                                        ) : (
                                                            <span className="text-xs text-red-500">✗ Not on XMTP</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(member.address)}
                                                className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-100 rounded-xl"
                            >
                                <p className="text-sm text-red-600">{error}</p>
                            </motion.div>
                        )}

                        {/* Not Connected Warning */}
                        {!isConnected && (
                            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                                <p className="text-sm text-yellow-600">
                                    Connecting to XMTP... Please wait.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3.5 px-4 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={isCreating || !isConnected || !groupName.trim() || members.filter(m => m.isReachable).length === 0}
                                className="flex-1 py-3.5 px-4 bg-gradient-to-br from-gray-800 to-black text-white rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Group
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
