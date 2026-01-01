/**
 * Security Unit Tests
 * 
 * CRITICAL: These tests MUST pass before deployment.
 * They prove XSS payloads are stripped and validation works.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    sanitizeMessage,
    validateAddress,
    validateMessageLength,
    validateHandle,
    sanitizeDisplayName,
    truncateAddress,
} from '../SecurityService';
import {
    messageRateLimiter,
    groupCreationRateLimiter,
    identityRateLimiter,
    clearAllLimits,
} from '../RateLimiter';

describe('SecurityService', () => {
    describe('sanitizeMessage', () => {
        it('strips script tags completely', () => {
            const xss = "<script>alert('XSS')</script>";
            expect(sanitizeMessage(xss)).toBe('');
        });

        it('strips script with content', () => {
            const xss = "<script>document.cookie</script>Legitimate text";
            expect(sanitizeMessage(xss)).toBe('Legitimate text');
        });

        it('strips img onerror XSS', () => {
            const xss = '<img src="x" onerror="alert(1)">';
            expect(sanitizeMessage(xss)).toBe('');
        });

        it('strips svg onload XSS', () => {
            const xss = '<svg onload="alert(1)">';
            expect(sanitizeMessage(xss)).toBe('');
        });

        it('strips iframe injection', () => {
            const xss = '<iframe src="https://evil.com"></iframe>';
            expect(sanitizeMessage(xss)).toBe('');
        });

        it('strips event handlers', () => {
            const xss = '<div onclick="alert(1)">Click me</div>';
            expect(sanitizeMessage(xss)).toBe('Click me');
        });

        it('strips anchor with javascript protocol', () => {
            const xss = '<a href="javascript:alert(1)">Click</a>';
            expect(sanitizeMessage(xss)).toBe('Click');
        });

        it('preserves plain text', () => {
            const safe = 'Hello, this is a safe message!';
            expect(sanitizeMessage(safe)).toBe(safe);
        });

        it('preserves emojis', () => {
            const emoji = 'Hello! 👋🌍🚀';
            expect(sanitizeMessage(emoji)).toBe(emoji);
        });

        it('trims whitespace', () => {
            expect(sanitizeMessage('  hello  ')).toBe('hello');
        });

        it('handles non-string input', () => {
            // @ts-expect-error Testing runtime safety
            expect(sanitizeMessage(null)).toBe('');
            // @ts-expect-error Testing runtime safety
            expect(sanitizeMessage(undefined)).toBe('');
            // @ts-expect-error Testing runtime safety
            expect(sanitizeMessage(123)).toBe('');
        });

        it('enforces max length', () => {
            const longMessage = 'a'.repeat(15000);
            const result = sanitizeMessage(longMessage);
            expect(result.length).toBe(10000);
        });
    });

    describe('validateAddress', () => {
        it('accepts valid Ethereum address', () => {
            expect(validateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
            expect(validateAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12')).toBe(true);
        });

        it('rejects address without 0x prefix', () => {
            expect(validateAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
        });

        it('rejects address with wrong length', () => {
            expect(validateAddress('0x1234')).toBe(false);
            expect(validateAddress('0x1234567890abcdef1234567890abcdef1234567890')).toBe(false);
        });

        it('rejects address with invalid characters', () => {
            expect(validateAddress('0x1234567890abcdef1234567890abcdef1234567g')).toBe(false);
        });

        it('rejects non-string input', () => {
            // @ts-expect-error Testing runtime safety
            expect(validateAddress(null)).toBe(false);
            // @ts-expect-error Testing runtime safety
            expect(validateAddress(123)).toBe(false);
        });
    });

    describe('validateMessageLength', () => {
        it('accepts valid length messages', () => {
            expect(validateMessageLength('Hello')).toBe(true);
            expect(validateMessageLength('a'.repeat(10000))).toBe(true);
        });

        it('rejects empty messages', () => {
            expect(validateMessageLength('')).toBe(false);
        });

        it('rejects messages over 10000 chars', () => {
            expect(validateMessageLength('a'.repeat(10001))).toBe(false);
        });
    });

    describe('validateHandle', () => {
        it('accepts valid handles', () => {
            expect(validateHandle('@NeonViper92')).toBe(true);
            expect(validateHandle('@user_123')).toBe(true);
            expect(validateHandle('@abc')).toBe(true);
        });

        it('rejects handles without @', () => {
            expect(validateHandle('NeonViper92')).toBe(false);
        });

        it('rejects handles too short', () => {
            expect(validateHandle('@ab')).toBe(false);
        });

        it('rejects handles too long', () => {
            expect(validateHandle('@' + 'a'.repeat(25))).toBe(false);
        });

        it('rejects handles with special chars', () => {
            expect(validateHandle('@user!')).toBe(false);
            expect(validateHandle('@user@test')).toBe(false);
        });
    });

    describe('sanitizeDisplayName', () => {
        it('strips HTML from display names', () => {
            expect(sanitizeDisplayName('<b>Bold Name</b>')).toBe('Bold Name');
        });

        it('enforces max length of 50', () => {
            const longName = 'a'.repeat(100);
            expect(sanitizeDisplayName(longName).length).toBe(50);
        });
    });

    describe('truncateAddress', () => {
        it('truncates valid address', () => {
            expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678'))
                .toBe('0x1234...5678');
        });

        it('returns empty for invalid address', () => {
            expect(truncateAddress('invalid')).toBe('');
        });
    });
});

describe('RateLimiter', () => {
    beforeEach(() => {
        clearAllLimits();
    });

    describe('messageRateLimiter', () => {
        it('allows messages under the limit', () => {
            for (let i = 0; i < 20; i++) {
                expect(messageRateLimiter.attempt('user1')).toBe(true);
            }
        });

        it('blocks messages over the limit', () => {
            for (let i = 0; i < 20; i++) {
                messageRateLimiter.attempt('user1');
            }
            expect(messageRateLimiter.attempt('user1')).toBe(false);
        });

        it('tracks users separately', () => {
            for (let i = 0; i < 20; i++) {
                messageRateLimiter.attempt('user1');
            }
            expect(messageRateLimiter.attempt('user1')).toBe(false);
            expect(messageRateLimiter.attempt('user2')).toBe(true);
        });

        it('reports remaining requests', () => {
            expect(messageRateLimiter.remaining('user1')).toBe(20);
            messageRateLimiter.attempt('user1');
            expect(messageRateLimiter.remaining('user1')).toBe(19);
        });
    });

    describe('groupCreationRateLimiter', () => {
        it('allows 5 group creations per hour', () => {
            for (let i = 0; i < 5; i++) {
                expect(groupCreationRateLimiter.attempt('user1')).toBe(true);
            }
            expect(groupCreationRateLimiter.attempt('user1')).toBe(false);
        });
    });

    describe('identityRateLimiter', () => {
        it('allows only 1 identity generation', () => {
            expect(identityRateLimiter.attempt('user1')).toBe(true);
            expect(identityRateLimiter.attempt('user1')).toBe(false);
        });
    });
});
