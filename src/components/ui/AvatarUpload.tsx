/**
 * Avatar Upload Component
 * 
 * Premium image upload with squircle preview.
 * Supports drag-and-drop, click to upload, and image cropping.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidGlassAvatar } from './LiquidGlassAvatar';
import { triggerHaptic, hapticSuccess, hapticError } from '@/lib/haptics';
import { uploadToIPFS, isIPFSConfigured } from '@/lib/IPFSService';

interface AvatarUploadProps {
    currentAvatarUrl: string | null;
    walletAddress: string;
    displayName?: string | null;
    onUpload: (imageDataUrl: string) => void;
    onRemove?: () => void;
    size?: 'md' | 'lg' | 'xl' | '2xl';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function AvatarUpload({
    currentAvatarUrl,
    walletAddress,
    displayName,
    onUpload,
    onRemove: _onRemove,
    size = 'xl'
}: AvatarUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ipfsEnabled = isIPFSConfigured();

    const sizeClasses = {
        md: 'w-16 h-16',
        lg: 'w-20 h-20',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32',
    };

    const processImage = useCallback(async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas for cropping to square
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    const outputSize = 256; // Standard avatar size

                    canvas.width = outputSize;
                    canvas.height = outputSize;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // Calculate crop area (center of image)
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;

                    // Draw cropped and resized image
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);

                    // Convert to data URL
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataUrl);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }, []);

    const handleFile = useCallback(async (file: File) => {
        setError(null);

        // Validate file type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Please upload a JPEG, PNG, GIF, or WebP image');
            hapticError();
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setError('Image must be under 5MB');
            hapticError();
            return;
        }

        setIsProcessing(true);
        triggerHaptic('light');

        try {
            const dataUrl = await processImage(file);
            setPreviewUrl(dataUrl);
            setShowPreview(true);
        } catch (err) {
            setError('Failed to process image');
            hapticError();
        } finally {
            setIsProcessing(false);
        }
    }, [processImage]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleConfirm = async () => {
        if (!previewUrl) return;

        // If IPFS is configured, upload there
        if (ipfsEnabled) {
            setIsUploading(true);
            const result = await uploadToIPFS(previewUrl, 'avatar.jpg');
            setIsUploading(false);

            if (result.success && result.url) {
                onUpload(result.url);
                hapticSuccess();
            } else {
                // Fallback to local data URL if IPFS fails
                onUpload(previewUrl);
                hapticSuccess();
            }
        } else {
            // Use local data URL
            onUpload(previewUrl);
            hapticSuccess();
        }

        setShowPreview(false);
        setPreviewUrl(null);
    };

    const handleCancel = () => {
        setShowPreview(false);
        setPreviewUrl(null);
        setError(null);
    };

    return (
        <>
            <div className="relative inline-block">
                {/* Main Avatar Display */}
                <motion.div
                    className={`
                        ${sizeClasses[size]}
                        relative cursor-pointer rounded-full overflow-hidden
                        ${isDragging ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                    `}
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="w-full h-full flex items-center justify-center">
                        <LiquidGlassAvatar
                            address={walletAddress}
                            displayName={displayName}
                            avatarUrl={currentAvatarUrl}
                            size={size}
                            animate={false}
                            showInitial={true}
                            className="!w-full !h-full"
                        />
                    </div>

                    {/* Processing spinner */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <motion.div
                                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                    )}
                </motion.div>

                {/* Floating Camera Edit Badge - Bottom Right */}
                <button
                    onClick={handleClick}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    title="Change photo"
                >
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>

            {/* Error message */}
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-2 text-center"
                >
                    {error}
                </motion.p>
            )}

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && previewUrl && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
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
                            <h3 className="text-lg font-bold text-gray-900 text-center mb-4">
                                Preview
                            </h3>

                            {/* Squircle Preview */}
                            <div className="flex justify-center mb-6">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm text-center mb-2">
                                This will be your new profile picture
                            </p>
                            {ipfsEnabled && (
                                <p className="text-xs text-gray-400 text-center mb-6">
                                    📡 Will be stored on IPFS
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    disabled={isUploading}
                                    className="flex-1 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isUploading}
                                    className="flex-1 py-3 rounded-xl font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {isUploading ? 'Uploading...' : 'Use Photo'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
