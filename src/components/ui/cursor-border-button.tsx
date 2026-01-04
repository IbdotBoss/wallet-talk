"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorBorderButtonProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Button with hover border gradient that follows cursor
 */
export function CursorBorderButton({ children, className, onClick, ...props }: CursorBorderButtonProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            onClick={onClick}
            className={cn(
                "relative inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-gray-900 overflow-hidden group cursor-pointer w-full transition-all hover:border-gray-300 hover:shadow-sm active:scale-[0.98]",
                className
            )}
            {...props}
        >
            {/* The "Following" Gradient Border Effect - subtle for white theme */}
            <div
                className="pointer-events-none absolute -inset-px transition-opacity duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(120px circle at ${position.x}px ${position.y}px, rgba(0, 0, 0, 0.05), transparent 80%)`,
                }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </div>
    );
}
