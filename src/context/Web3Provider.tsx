import React, { useEffect, useRef } from 'react';
import { createAppKit, useAppKitTheme } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter, projectId, networks, metadata } from '../config/wagmi';
import { useTheme } from './ThemeContext';

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
  },
});

// Initialize Reown AppKit Modal with Apple-minimalist styling
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#10B981',
    '--w3m-border-radius-master': '12px',
    '--w3m-font-family': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

// Synchronize Reown AppKit Theme with App Light/Dark Theme safely without render loops
const AppKitThemeSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  const { themeMode, setThemeMode } = useAppKitTheme();
  const lastSyncedTheme = useRef<string | null>(null);

  useEffect(() => {
    if (lastSyncedTheme.current !== resolvedTheme && themeMode !== resolvedTheme) {
      lastSyncedTheme.current = resolvedTheme;
      setThemeMode(resolvedTheme);
    }
  }, [resolvedTheme, themeMode, setThemeMode]);

  return <>{children}</>;
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitThemeSync>
          {children}
        </AppKitThemeSync>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
