/**
 * SecurityService - Central sanitization and validation service
 * 
 * SECURITY BOUNDARY: All user input MUST pass through this service.
 * Rule: NEVER use dangerouslySetInnerHTML directly. Always sanitize.
 */

import DOMPurify from 'dompurify';

// STRICT CONFIG: Strip ALL HTML tags. Text only.
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [] as string[], // No HTML allowed
    ALLOWED_ATTR: [] as string[], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
};

// Validation constants
const MAX_MESSAGE_LENGTH = 10_000;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HANDLE_REGEX = /^@[a-zA-Z0-9_]{3,20}$/;
const DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * Sanitizes a message by stripping ALL HTML.
 * XSS payloads like <script>alert('XSS')</script> become empty strings.
 */
export function sanitizeMessage(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    // First pass: DOMPurify with strict config
    const sanitized = DOMPurify.sanitize(input.trim(), SANITIZE_CONFIG);

    // Enforce max length after sanitization
    return sanitized.slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Validates an Ethereum address format.
 * Pattern: 0x followed by exactly 40 hex characters
 */
export function validateAddress(address: string): boolean {
    if (typeof address !== 'string') {
        return false;
    }
    return ETH_ADDRESS_REGEX.test(address);
}

/**
 * Validates message length is within bounds.
 */
export function validateMessageLength(message: string): boolean {
    if (typeof message !== 'string') {
        return false;
    }
    return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Validates a @handle format.
 * Pattern: @ followed by 3-20 alphanumeric/underscore characters
 */
export function validateHandle(handle: string): boolean {
    if (typeof handle !== 'string') {
        return false;
    }
    return HANDLE_REGEX.test(handle);
}

/**
 * Sanitizes a display name.
 * Strips HTML and enforces max length.
 */
export function sanitizeDisplayName(name: string): string {
    if (typeof name !== 'string') {
        return '';
    }

    const sanitized = DOMPurify.sanitize(name.trim(), SANITIZE_CONFIG);
    return sanitized.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Truncates an address for display (0x1234...5678)
 */
export function truncateAddress(address: string): string {
    if (!validateAddress(address)) {
        return '';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Security logger for auditing
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
        console.warn(`[SECURITY] ${event}`, details);
    }
    // In production, this could send to a security monitoring service
}
