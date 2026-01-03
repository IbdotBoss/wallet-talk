"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

/**
 * Premium shimmer button with conic gradient rotation
 * Creates a 3D-like spinning light effect
 */
export function ShimmerButton({
    children,
    className,
    containerClassName,
    ...props
}: ShimmerButtonProps) {
    return (
        <button
            className={cn(
                "group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                containerClassName
            )}
            {...props}
        >
            {/* Animated conic gradient border */}
            <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{
                    background: "conic-gradient(from 0deg, #007AFF, #5856D6, #AF52DE, #007AFF)",
                }}
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Tight mask overlay for sharper effect */}
            <div
                className="absolute inset-[1px] rounded-[14px] bg-black"
                style={{
                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    maskComposite: "exclude",
                    WebkitMaskComposite: "xor",
                }}
            />

            {/* Inner content */}
            <div
                className={cn(
                    "relative z-10 flex items-center justify-center gap-2 rounded-[14px] bg-[#1c1c1e] px-6 py-3.5 font-medium text-white transition-colors group-hover:bg-[#252528]",
                    className
                )}
            >
                {/* Shimmer highlight on hover */}
                <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div
                        className="absolute inset-0 rounded-[14px]"
                        style={{
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                            animation: "shimmer-slide 2s ease-in-out infinite",
                        }}
                    />
                </div>

                {children}
            </div>

            {/* Glow effect */}
            <div
                className="absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40"
                style={{
                    background: "conic-gradient(from 0deg, #007AFF, #5856D6, #AF52DE, #007AFF)",
                }}
            />
        </button>
    );
}
