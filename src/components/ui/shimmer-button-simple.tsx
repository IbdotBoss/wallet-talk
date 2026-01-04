"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonSimpleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
}

/**
 * Simple Shimmer Button (Linear)
 * Uses Tailwind's animate-shimmer with a linear gradient background.
 */
export function ShimmerButtonSimple({
    children,
    className,
    ...props
}: ShimmerButtonSimpleProps) {
    return (
        <button
            className={cn(
                "inline-flex h-12 animate-shimmer items-center justify-center rounded-xl border border-black/10 bg-[linear-gradient(110deg,#000000,45%,#333333,55%,#000000)] bg-[length:200%_100%] px-6 font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-white",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
