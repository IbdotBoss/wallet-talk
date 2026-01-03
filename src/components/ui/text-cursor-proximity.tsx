"use client";

import React, { CSSProperties, ElementType, forwardRef, useRef, useMemo } from "react";
import {
    motion,
    useAnimationFrame,
    useMotionValue,
    useTransform,
} from "framer-motion";

import { useMousePositionRef } from "@/hooks/use-mouse-position-ref";
import { cn } from "@/lib/utils";

type CSSPropertiesWithValues = {
    [K in keyof CSSProperties]: string | number;
};

interface StyleValue<T extends keyof CSSPropertiesWithValues> {
    from: CSSPropertiesWithValues[T];
    to: CSSPropertiesWithValues[T];
}

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    as?: ElementType;
    styles: Partial<{
        [K in keyof CSSPropertiesWithValues]: StyleValue<K>;
    }>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    radius?: number;
    falloff?: "linear" | "exponential" | "gaussian";
}

// Letter component to handle individual letter animations with blur
const AnimatedLetter = ({
    letter,
    styles,
    proximity,
    letterRef,
}: {
    letter: string;
    styles: TextProps["styles"];
    proximity: ReturnType<typeof useMotionValue<number>>;
    letterRef: (el: HTMLSpanElement | null) => void;
}) => {
    // Transform proximity (0 = far, 1 = near) into blur (far = blurred, near = clear)
    const blur = useTransform(proximity, [0, 1], [8, 0]);
    const opacity = useTransform(proximity, [0, 1], [0.3, 1]);

    // Build additional transforms from styles prop
    const additionalStyles = useMemo(() => {
        const result: Record<string, ReturnType<typeof useTransform>> = {};
        Object.entries(styles).forEach(([key, value]) => {
            if (value && key !== 'filter' && key !== 'opacity') {
                result[key] = useTransform(proximity, [0, 1], [value.from, value.to]);
            }
        });
        return result;
    }, [styles, proximity]);

    return (
        <motion.span
            ref={letterRef}
            className="inline-block"
            aria-hidden="true"
            style={{
                filter: useTransform(blur, (v) => `blur(${v}px)`),
                opacity,
                ...additionalStyles,
            } as any}
        >
            {letter}
        </motion.span>
    );
};

const TextCursorProximity = forwardRef<HTMLSpanElement, TextProps>(
    (
        {
            children,
            as,
            styles,
            containerRef,
            radius = 80,
            falloff = "gaussian",
            className,
            ...props
        },
        ref
    ) => {
        const Component = as ?? "span";
        const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
        const mousePositionRef = useMousePositionRef(containerRef);
        const text = React.Children.toArray(children).join("");

        // Create motion values for each letter
        const letterProximities = useRef(
            Array(text.replace(/\s/g, "").length)
                .fill(0)
                .map(() => useMotionValue(0))
        ).current;

        const calculateDistance = (
            x1: number,
            y1: number,
            x2: number,
            y2: number
        ): number => {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        };

        const calculateFalloff = (distance: number): number => {
            const normalizedDistance = Math.min(
                Math.max(1 - distance / radius, 0),
                1
            );
            switch (falloff) {
                case "exponential":
                    return Math.pow(normalizedDistance, 2);
                case "gaussian":
                    return Math.exp(-Math.pow(distance / (radius / 2), 2) / 2);
                case "linear":
                default:
                    return normalizedDistance;
            }
        };

        useAnimationFrame(() => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            letterRefs.current.forEach((letterRef, index) => {
                if (!letterRef) return;
                const rect = letterRef.getBoundingClientRect();
                const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
                const letterCenterY = rect.top + rect.height / 2 - containerRect.top;
                const distance = calculateDistance(
                    mousePositionRef.current.x,
                    mousePositionRef.current.y,
                    letterCenterX,
                    letterCenterY
                );
                const proximity = calculateFalloff(distance);
                letterProximities[index].set(proximity);
            });
        });

        const words = text.split(" ");
        let letterIndex = 0;

        return (
            <Component ref={ref} className={cn("", className)} {...props}>
                {words.map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-block" aria-hidden={true}>
                        {word.split("").map((letter) => {
                            const currentLetterIndex = letterIndex++;
                            const proximity = letterProximities[currentLetterIndex];

                            return (
                                <AnimatedLetter
                                    key={currentLetterIndex}
                                    letter={letter}
                                    styles={styles}
                                    proximity={proximity}
                                    letterRef={(el) => {
                                        letterRefs.current[currentLetterIndex] = el;
                                    }}
                                />
                            );
                        })}
                        {wordIndex < words.length - 1 && (
                            <span className="inline-block">&nbsp;</span>
                        )}
                    </span>
                ))}
                <span className="sr-only">{text}</span>
            </Component>
        );
    }
);

TextCursorProximity.displayName = "TextCursorProximity";
export default TextCursorProximity;
