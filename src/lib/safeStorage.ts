/**
 * Safe localStorage access with try/catch for private/incognito browsers.
 * Safari private mode throws QUOTA_EXCEEDED_ERROR on any storage operation.
 */
export const safeStorage = {
    getItem(key: string): string | null {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    setItem(key: string, value: string): void {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
    },
    removeItem(key: string): void {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
};
