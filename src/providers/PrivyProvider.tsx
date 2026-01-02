/**
 * PrivyProvider - Strict authentication configuration
 * 
 * SECURITY: No social logins. Passkeys + Wallets ONLY.
 * Keys are managed by Privy MPC - never touch LocalStorage.
 */

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

export function PrivyProvider({ children }: Props) {
    const appId = import.meta.env.VITE_PRIVY_APP_ID;

    if (!appId) {
        console.error('[SECURITY] VITE_PRIVY_APP_ID not configured');
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="glass-card p-8 max-w-md text-center">
                    <h1 className="text-xl font-semibold text-error mb-2">Configuration Error</h1>
                    <p className="text-text-secondary">
                        Privy App ID not configured. Please set VITE_PRIVY_APP_ID in your environment.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Privy
            appId={appId}
            config={{
                // STRICT: No social logins
                loginMethods: ['wallet', 'passkey'],

                // Appearance
                appearance: {
                    theme: 'dark',
                    accentColor: '#6366f1',
                    logo: '/logo.svg',
                    showWalletLoginFirst: false,
                },

                // Embedded wallets configuration
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },

                // Session security
                // Auto-logout after 30 minutes of inactivity
                // Note: Session timeout is configured in Privy dashboard

                // Legal
                legal: {
                    termsAndConditionsUrl: '/terms',
                    privacyPolicyUrl: '/privacy',
                },
            }}
        >
            {children}
        </Privy>
    );
}
