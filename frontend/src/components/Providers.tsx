"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/config";

// Single QueryClient with aggressive caching — avoids refetch on every tab focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,  // 30s before re-fetch
      gcTime:               300_000, // 5min cache
      refetchOnWindowFocus: false,
      retry:                1,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
