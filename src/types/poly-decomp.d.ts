declare module 'poly-decomp' {
    export function quickDecomp(polygon: number[][]): number[][][];
    export function decomp(polygon: number[][]): number[][][];
    export function isSimple(polygon: number[][]): boolean;
    export function makeCCW(polygon: number[][]): void;
    export function removeCollinearPoints(polygon: number[][], thresholdAngle?: number): void;
    export default {
        quickDecomp,
        decomp,
        isSimple,
        makeCCW,
        removeCollinearPoints
    };
}
