/**
 * Group Info Modal
 * 
 * View and edit group details, manage members, and leave group.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePrivy } from '@privy-io/react-auth';
import { useSecureXMTP } from '@/hooks/useSecureXMTP_v2';
import { validateAddress, truncateAddress } from '@/lib/SecurityService';
import { LiquidGlassAvatar } from '@/components/ui/LiquidGlassAvatar';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';

interface GroupInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    groupImageUrl?: string;
}

interface GroupMember {
    address: string;
    isAdmin: boolean;
}

export function GroupInfoModal({
    isOpen,
    onClose,
    groupId,
    groupName: initialGroupName,
    groupImageUrl: initialGroupImageUrl
}: GroupInfoModalProps) {
    const { user } = usePrivy();
    const {
        getGroupMembers,
        addGroupMembers,
        leaveGroup,
        updateGroupInfo,
        getMyGroupRole,
    } = useSecureXMTP();

    const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
    const [groupName, setGroupName] = useState(initialGroupName);
    const [groupImageUrl, setGroupImageUrl] = useState<string | null>(initialGroupImageUrl || null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [newMemberInput, setNewMemberInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<{ isAdmin: boolean; isSuperAdmin: boolean; isMember: boolean } | null>(null);

    // Fetch members and role on open
    useEffect(() => {
        if (isOpen && groupId) {
            loadMembers();
            loadMyRole();
        }
    }, [isOpen, groupId]);

    const loadMyRole = async () => {
        try {
            const role = await getMyGroupRole(groupId);
            setMyRole(role);
            console.log('[GroupInfo] My role:', role);
        } catch (err) {
            console.error('Failed to load role', err);
        }
    };

    const loadMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const fetchedMembers = await getGroupMembers(groupId);
            // Deduplicate and map
            const uniqueMembers = Array.from(new Set(fetchedMembers.map(m => m.address)))
                .map(addr => fetchedMembers.find(m => m.address === addr))
                .filter((m): m is any => !!m)
                .map(m => ({
                    address: m.address,
                    isAdmin: m.isAdmin || false
                }));
            setMembers(uniqueMembers);
        } catch (err) {
            console.error('Failed to load members', err);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleSaveInfo = async () => {
        if (!groupName.trim()) {
            setError('Group name cannot be empty');
            return;
        }

        setIsSaving(true);
        setError(null); // Clear previous errors
        triggerHaptic('medium');

        try {
            const updates: { name?: string; imageUrl?: string } = {};

            if (groupName.trim() !== initialGroupName) {
                updates.name = groupName.trim();
            }
            if (groupImageUrl !== initialGroupImageUrl) {
                updates.imageUrl = groupImageUrl || undefined;
            }

            // Only call update if there are actual changes
            if (Object.keys(updates).length === 0) {
                setIsSaving(false);
                return;
            }

            const success = await updateGroupInfo(groupId, updates);

            if (success) {
                hapticSuccess();
                setError(null);
            } else {
                hapticError();
                setError('Failed to update group info. You may not have permission to edit this group.');
            }
        } catch (err) {
            hapticError();
            console.error('Group update error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = async () => {
        const address = newMemberInput.trim();
        if (!address || !validateAddress(address)) {
            setError('Invalid Ethereum address');
            hapticError();
            return;
        }

        setIsSaving(true);
        try {
            const success = await addGroupMembers(groupId, [address]);
            if (success) {
                hapticSuccess();
                setNewMemberInput('');
                loadMembers(); // Reload list
            } else {
                setError('Failed to add member');
                hapticError();
            }
        } catch (err) {
            setError('Failed to add member');
            hapticError();
        } finally {
            setIsSaving(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        setIsLeaving(true);
        triggerHaptic('heavy');

        try {
            const success = await leaveGroup(groupId);
            if (success) {
                hapticSuccess();
                onClose();
                // Navigation back should be handled by parent if needed
            } else {
                setError('Failed to leave group');
                hapticError();
            }
        } catch (err) {
            setError('Failed to leave group');
            hapticError();
        } finally {
            setIsLeaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900">Group Info</h2>
                            {myRole && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${myRole.isSuperAdmin
                                    ? 'bg-purple-100 text-purple-700'
                                    : myRole.isAdmin
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {myRole.isSuperAdmin ? 'Super Admin' : myRole.isAdmin ? 'Admin' : 'Member'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'info'
                                ? 'text-black border-b-2 border-black'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'members'
                                ? 'text-black border-b-2 border-black'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Members ({members.length})
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {activeTab === 'info' ? (
                            <div className="space-y-6">
                                {/* Group Image */}
                                <div className="flex justify-center">
                                    {myRole?.isAdmin || myRole?.isSuperAdmin ? (
                                        <AvatarUpload
                                            currentAvatarUrl={groupImageUrl}
                                            walletAddress={groupId} // Use group ID for gradient seed
                                            displayName={groupName}
                                            onUpload={(url) => setGroupImageUrl(url)}
                                            onRemove={() => setGroupImageUrl(null)}
                                            size="2xl"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {groupImageUrl ? (
                                                <img src={groupImageUrl} alt={groupName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-4xl text-gray-300">{groupName.charAt(0).toUpperCase()}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Group Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    {(myRole?.isAdmin || myRole?.isSuperAdmin) ? (
                                        <input
                                            type="text"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 focus:ring-2 focus:ring-black focus:outline-none"
                                            placeholder="Enter group name"
                                        />
                                    ) : (
                                        <div className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900">
                                            {groupName || 'Unnamed Group'}
                                        </div>
                                    )}
                                </div>

                                {/* Admin-only notice */}
                                {!(myRole?.isAdmin || myRole?.isSuperAdmin) && (
                                    <div className="p-3 bg-yellow-50 text-yellow-700 rounded-xl text-sm">
                                        Only admins can edit group info. Contact an admin to request changes.
                                    </div>
                                )}

                                {/* Save Button - Admin only */}
                                {(myRole?.isAdmin || myRole?.isSuperAdmin) && (
                                    <button
                                        onClick={handleSaveInfo}
                                        disabled={isSaving || (groupName === initialGroupName && groupImageUrl === initialGroupImageUrl)}
                                        className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}

                                <div className="border-t border-gray-100 pt-6 mt-6">
                                    <button
                                        onClick={handleLeaveGroup}
                                        disabled={isLeaving}
                                        className="w-full py-3 text-red-600 bg-red-50 rounded-xl font-medium hover:bg-red-100 transition-colors"
                                    >
                                        {isLeaving ? 'Leaving...' : 'Leave Group'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Add Member - Admin only */}
                                {(myRole?.isAdmin || myRole?.isSuperAdmin) ? (
                                    <div className="flex gap-2 mb-6">
                                        <input
                                            type="text"
                                            value={newMemberInput}
                                            onChange={(e) => setNewMemberInput(e.target.value)}
                                            placeholder="Add member (0x...)"
                                            className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-xl text-gray-900 focus:ring-2 focus:ring-black focus:outline-none text-sm"
                                        />
                                        <button
                                            onClick={handleAddMember}
                                            disabled={!newMemberInput.trim() || isSaving}
                                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-500 mb-4">
                                        Only admins can add members.
                                    </div>
                                )}

                                {/* Member List */}
                                {isLoadingMembers ? (
                                    <div className="text-center text-gray-400 py-4">Loading members...</div>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map((member) => (
                                            <div key={member.address} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <LiquidGlassAvatar
                                                        address={member.address}
                                                        size="sm"
                                                        animate={false}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {truncateAddress(member.address)}
                                                            {member.address.toLowerCase() === user?.wallet?.address?.toLowerCase() && ' (You)'}
                                                        </p>
                                                        {member.isAdmin && (
                                                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Admin</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
