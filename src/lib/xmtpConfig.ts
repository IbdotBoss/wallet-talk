import type { XmtpEnv } from '@xmtp/browser-sdk';

// XMTP network environment. dev and production are completely separate networks.
export const XMTP_ENV: XmtpEnv = (import.meta.env.VITE_XMTP_ENV as XmtpEnv) || 'production';

// Optional explicit history-sync URL. The SDK already picks the right default
// for the chosen env; only set VITE_XMTP_HISTORY_SYNC_URL to override it.
export const XMTP_HISTORY_SYNC_URL: string | undefined =
    import.meta.env.VITE_XMTP_HISTORY_SYNC_URL || undefined;
