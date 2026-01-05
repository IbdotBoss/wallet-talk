/**
 * AnimateOnScroll Component
 * 
 * Wrapper component for scroll-triggered animations
 * Provides Apple-style entrance animations with customizable variants
 */

import { motion, Variants } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimateOnScrollProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale';
    delay?: number;
    duration?: number;
    threshold?: number;
    triggerOnce?: boolean;
}

const variants: Record<string, Variants> = {
    fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
    slideUp: {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0 },
    },
    slideLeft: {
        hidden: { opacity: 0, x: 24 },
        visible: { opacity: 1, x: 0 },
    },
    slideRight: {
        hidden: { opacity: 0, x: -24 },
        visible: { opacity: 1, x: 0 },
    },
    scale: {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
    },
};

export function AnimateOnScroll({
    children,
    className,
    variant = 'slideUp',
    delay = 0,
    duration = 0.6,
    threshold = 0.1,
    triggerOnce = true,
}: AnimateOnScrollProps) {
    const { ref, isVisible } = useScrollAnimation({ threshold, triggerOnce });

    return (
        <motion.div
            ref={ref as any}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={variants[variant]}
            transition={{
                duration,
                delay,
                ease: [0.16, 1, 0.3, 1], // Apple's easing
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}