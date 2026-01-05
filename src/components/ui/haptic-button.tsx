/**
 * HapticButton Component
 * 
 * Button wrapper that automatically provides haptic feedback on interactions
 * Apple-style smooth animations with press states
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';

interface HapticButtonProps extends Omit<HTMLMotionProps<'button'>, 'onTap'> {
    children: React.ReactNode;
    hapticIntensity?: 'light' | 'medium' | 'heavy';
    onTap?: () => void;
    scaleOnPress?: number;
}

export function HapticButton({
    children,
    hapticIntensity = 'light',
    onTap,
    scaleOnPress = 0.96,
    className,
    disabled,
    ...props
}: HapticButtonProps) {
    const handleTap = () => {
        if (!disabled) {
            triggerHaptic(hapticIntensity);
            onTap?.();
        }
    };

    return (
        <motion.button
            {...props}
            className={className}
            disabled={disabled}
            onClick={handleTap}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: scaleOnPress }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
            }}
        >
            {children}
        </motion.button>
    );
}