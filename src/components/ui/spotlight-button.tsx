"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

/**
 * Spotlight button with mouse-tracking gradient reveal
 * Reveals teal gradient mesh behind text as cursor moves
 */
export function SpotlightButton({
    children,
    className,
    containerClassName,
    ...props
}: SpotlightButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <button
            ref={buttonRef}
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] transition-all duration-300 hover:border-[rgba(0,212,182,0.3)] hover:scale-[1.02] active:scale-[0.98]",
                containerClassName
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            {/* Base background */}
            <div className="absolute inset-0 bg-[#1c1c1e]" />

            {/* Teal gradient mesh background */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `
            radial-gradient(ellipse 80% 50% at 50% 120%, rgba(0, 212, 182, 0.15), transparent),
            radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0, 150, 136, 0.1), transparent),
            radial-gradient(ellipse 50% 60% at 20% 80%, rgba(0, 188, 212, 0.08), transparent)
          `,
                }}
            />

            {/* Spotlight effect that follows mouse */}
            <motion.div
                className="absolute pointer-events-none"
                animate={{
                    x: mousePosition.x - 100,
                    y: mousePosition.y - 100,
                    opacity: isHovered ? 1 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 },
                }}
                style={{
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(0, 212, 182, 0.25) 0%, transparent 70%)",
                    filter: "blur(20px)",
                }}
            />

            {/* Network grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0, 212, 182, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 182, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: "20px 20px",
                }}
            />

            {/* Content */}
            <div
                className={cn(
                    "relative z-10 flex items-center justify-center gap-2 px-6 py-3.5 font-medium text-white",
                    className
                )}
            >
                {children}
            </div>

            {/* Subtle border glow on hover */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    boxShadow: "inset 0 0 20px rgba(0, 212, 182, 0.1)",
                }}
            />
        </button>
    );
}
