import type { XmtpEnv } from '@xmtp/browser-sdk';

// XMTP network environment. dev and production are completely separate networks.
export const XMTP_ENV: XmtpEnv = (import.meta.env.VITE_XMTP_ENV as XmtpEnv) || 'production';
