/**
 * Liquid Glass Avatar - Generative Gradient Avatar Component
 * 
 * Renders a premium squircle avatar with vibrant gradients
 * derived deterministically from wallet addresses.
 */

import { motion } from 'framer-motion';
import { generateAvatarGradient, getAvatarInitial } from '@/lib/AvatarGenerator';

interface LiquidGlassAvatarProps {
    address: string;
    displayName?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    showInitial?: boolean;
    animate?: boolean;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
};

const borderRadiusClasses = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
};

export function LiquidGlassAvatar({
    address,
    displayName,
    size = 'lg',
    className = '',
    showInitial = true,
    animate = true,
}: LiquidGlassAvatarProps) {
    const gradient = generateAvatarGradient(address);
    const initial = getAvatarInitial(displayName || null, address);

    const baseStyles = {
        background: gradient,
    };

    return (
        <motion.div
            className={`
                ${sizeClasses[size]}
                ${borderRadiusClasses[size]}
                flex items-center justify-center
                font-semibold text-white
                shadow-lg
                relative overflow-hidden
                ${className}
            `}
            style={baseStyles}
            initial={animate ? { scale: 0.8, opacity: 0 } : false}
            animate={animate ? { scale: 1, opacity: 1 } : false}
            whileHover={animate ? { scale: 1.05 } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {/* Glass overlay for premium feel */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
                }}
            />

            {/* Initial letter */}
            {showInitial && (
                <span className="relative z-10 font-bold drop-shadow-sm">
                    {initial}
                </span>
            )}
        </motion.div>
    );
}

/**
 * Avatar with online status indicator
 */
interface LiquidGlassAvatarWithStatusProps extends LiquidGlassAvatarProps {
    isOnline?: boolean;
}

export function LiquidGlassAvatarWithStatus({
    isOnline = false,
    ...props
}: LiquidGlassAvatarWithStatusProps) {
    return (
        <div className="relative inline-block">
            <LiquidGlassAvatar {...props} />
            <div
                className={`
                    absolute -bottom-0.5 -right-0.5
                    w-3 h-3 rounded-full
                    border-2 border-white
                    ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
                `}
            />
        </div>
    );
}
