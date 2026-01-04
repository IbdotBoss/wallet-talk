"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RotatingTorusProps {
    className?: string;
    dotCount?: number;
    torusRadius?: number;
    tubeRadius?: number;
    dotSize?: number;
    rotationSpeed?: number;
    color?: string;
}

/**
 * A 3D rotating torus (donut) made of dots
 * Inspired by the Notion QR code animation from reactiive.io
 * Pure CSS/Canvas implementation for web
 */
export function RotatingTorus({
    className,
    dotCount = 200,
    torusRadius = 150,
    tubeRadius = 60,
    dotSize = 4,
    rotationSpeed = 0.01,
    color = "rgba(0, 122, 255, 0.6)",
}: RotatingTorusProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const angleRef = useRef(0);

    // Generate torus points
    const points = useMemo(() => {
        const pts: { u: number; v: number }[] = [];
        // Create a grid of points around the torus
        const uSteps = Math.floor(Math.sqrt(dotCount));
        const vSteps = Math.floor(dotCount / uSteps);

        for (let i = 0; i < uSteps; i++) {
            for (let j = 0; j < vSteps; j++) {
                pts.push({
                    u: (i / uSteps) * Math.PI * 2,
                    v: (j / vSteps) * Math.PI * 2,
                });
            }
        }
        return pts;
    }, [dotCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Animation loop
        const animate = () => {
            const rect = canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Clear canvas
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Update rotation angle
            angleRef.current += rotationSpeed;
            const rotY = angleRef.current;
            const rotX = Math.PI / 6; // Slight tilt

            // Calculate and sort points by depth
            const projectedPoints = points.map((pt) => {
                // Torus parametric equations
                const x = (torusRadius + tubeRadius * Math.cos(pt.v)) * Math.cos(pt.u);
                const y = (torusRadius + tubeRadius * Math.cos(pt.v)) * Math.sin(pt.u);
                const z = tubeRadius * Math.sin(pt.v);

                // Rotate around Y axis
                const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

                // Rotate around X axis
                const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
                const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

                // Perspective projection
                const perspective = 400;
                const scale = perspective / (perspective + z2);
                const projX = x1 * scale + centerX;
                const projY = y2 * scale + centerY;

                return { x: projX, y: projY, z: z2, scale };
            });

            // Sort by z (furthest first for proper layering)
            projectedPoints.sort((a, b) => a.z - b.z);

            // Draw dots
            projectedPoints.forEach((pt) => {
                const opacity = 0.3 + (pt.z / (tubeRadius * 2)) * 0.7;
                const size = dotSize * pt.scale;

                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(size, 1), 0, Math.PI * 2);
                ctx.fillStyle = color.replace(/[\d.]+\)$/, `${Math.max(0.1, opacity)})`);
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationRef.current);
        };
    }, [points, torusRadius, tubeRadius, dotSize, rotationSpeed, color]);

    return (
        <motion.canvas
            ref={canvasRef}
            className={cn("absolute inset-0 w-full h-full", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
        />
    );
}

/**
 * Alternative: Simple rotating dot grid (lighter weight)
 */
export function RotatingDotGrid({
    className,
    rows = 12,
    cols = 12,
    dotSize = 3,
    gap = 24,
    color = "rgba(0, 122, 255, 0.4)",
}: {
    className?: string;
    rows?: number;
    cols?: number;
    dotSize?: number;
    gap?: number;
    color?: string;
}) {
    const dots = useMemo(() => {
        const result = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result.push({ row: i, col: j });
            }
        }
        return result;
    }, [rows, cols]);

    const gridWidth = cols * gap;
    const gridHeight = rows * gap;

    return (
        <motion.div
            className={cn("absolute inset-0 flex items-center justify-center overflow-hidden", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
        >
            <motion.div
                className="relative"
                style={{
                    width: gridWidth,
                    height: gridHeight,
                    transformStyle: "preserve-3d",
                    perspective: 1000,
                }}
                animate={{ rotateY: 360, rotateX: 15 }}
                transition={{
                    rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
                    rotateX: { duration: 0 },
                }}
            >
                {dots.map((dot, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: dotSize,
                            height: dotSize,
                            backgroundColor: color,
                            left: dot.col * gap,
                            top: dot.row * gap,
                            transformStyle: "preserve-3d",
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.002, duration: 0.3 }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}
