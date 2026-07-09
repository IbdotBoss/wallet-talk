/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PRIVY_APP_ID: string;
    readonly VITE_XMTP_ENV?: string;
    readonly VITE_XMTP_HISTORY_SYNC_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
