/**
 * useScrollAnimation Hook
 * 
 * Apple-style scroll-triggered animations using Intersection Observer
 * Provides smooth fade-in and slide-up effects as elements enter viewport
 */

import { useEffect, useRef, useState } from 'react';

interface ScrollAnimationOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
    const {
        threshold = 0.1,
        rootMargin = '0px 0px -10% 0px',
        triggerOnce = true,
    } = options;

    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { ref, isVisible };
}