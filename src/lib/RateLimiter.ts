/**
 * RateLimiter - Client-side rate limiting using sliding window algorithm
 * 
 * Prevents abuse of messaging and identity creation APIs.
 * Uses a sliding window approach for smoother rate limiting.
 */

import { logSecurityEvent } from './SecurityService';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

interface RateLimitEntry {
    timestamps: number[];
}

// Rate limit configurations
const LIMITS = {
    messages: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,      // 20 per minute
    groupCreation: { maxRequests: 5, windowMs: 3_600_000 } as RateLimitConfig, // 5 per hour
    identityGen: { maxRequests: 1, windowMs: 86_400_000 } as RateLimitConfig,  // 1 per day (session)
} as const;

type LimitType = keyof typeof LIMITS;

// In-memory storage for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Generates a unique key for rate limit tracking
 */
function getKey(type: LimitType, identifier?: string): string {
    return `${type}:${identifier || 'global'}`;
}

/**
 * Cleans expired timestamps from the window
 */
function cleanExpiredTimestamps(entry: RateLimitEntry, windowMs: number): number[] {
    const now = Date.now();
    return entry.timestamps.filter((ts) => now - ts < windowMs);
}

/**
 * Checks if an action is allowed under rate limiting
 */
function checkLimit(type: LimitType, identifier?: string): boolean {
    const config = LIMITS[type];
    const key = getKey(type, identifier);

    let entry = rateLimitStore.get(key);

    if (!entry) {
        entry = { timestamps: [] };
        rateLimitStore.set(key, entry);
    }

    // Clean expired timestamps
    entry.timestamps = cleanExpiredTimestamps(entry, config.windowMs);

    // Check if under limit
    return entry.timestamps.length < config.maxRequests;
}

/**
 * Records an action for rate limiting
 */
function recordAction(type: LimitType, identifier?: string): void {
    const key = getKey(type, identifier);
    let entry = rateLimitStore.get(key);

    if (!entry) {
        entry = { timestamps: [] };
        rateLimitStore.set(key, entry);
    }

    entry.timestamps.push(Date.now());
}

/**
 * Attempts an action with rate limiting.
 * Returns true if allowed, false if rate limited.
 */
function attemptAction(type: LimitType, identifier?: string): boolean {
    if (!checkLimit(type, identifier)) {
        logSecurityEvent('Rate limit exceeded', { type, identifier });
        return false;
    }

    recordAction(type, identifier);
    return true;
}

/**
 * Gets remaining requests in the current window
 */
function getRemainingRequests(type: LimitType, identifier?: string): number {
    const config = LIMITS[type];
    const key = getKey(type, identifier);
    const entry = rateLimitStore.get(key);

    if (!entry) {
        return config.maxRequests;
    }

    const validTimestamps = cleanExpiredTimestamps(entry, config.windowMs);
    return Math.max(0, config.maxRequests - validTimestamps.length);
}

/**
 * Gets time until the next request is allowed (in ms)
 */
function getTimeUntilReset(type: LimitType, identifier?: string): number {
    const config = LIMITS[type];
    const key = getKey(type, identifier);
    const entry = rateLimitStore.get(key);

    if (!entry || entry.timestamps.length === 0) {
        return 0;
    }

    const oldestTimestamp = Math.min(...entry.timestamps);
    const resetTime = oldestTimestamp + config.windowMs;
    return Math.max(0, resetTime - Date.now());
}

/**
 * Clears all rate limit data (for testing or logout)
 */
function clearAllLimits(): void {
    rateLimitStore.clear();
}

// Export message rate limiting functions
export const messageRateLimiter = {
    check: (userId?: string) => checkLimit('messages', userId),
    attempt: (userId?: string) => attemptAction('messages', userId),
    remaining: (userId?: string) => getRemainingRequests('messages', userId),
    resetIn: (userId?: string) => getTimeUntilReset('messages', userId),
};

// Export group creation rate limiting functions
export const groupCreationRateLimiter = {
    check: (userId?: string) => checkLimit('groupCreation', userId),
    attempt: (userId?: string) => attemptAction('groupCreation', userId),
    remaining: (userId?: string) => getRemainingRequests('groupCreation', userId),
    resetIn: (userId?: string) => getTimeUntilReset('groupCreation', userId),
};

// Export identity generation rate limiting functions
export const identityRateLimiter = {
    check: (userId?: string) => checkLimit('identityGen', userId),
    attempt: (userId?: string) => attemptAction('identityGen', userId),
    remaining: (userId?: string) => getRemainingRequests('identityGen', userId),
    resetIn: (userId?: string) => getTimeUntilReset('identityGen', userId),
};

// Export clear function for logout/testing
export { clearAllLimits };
