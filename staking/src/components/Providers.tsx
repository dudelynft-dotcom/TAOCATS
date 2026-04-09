"use client";
import { WagmiProvider, useReconnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { wagmiConfig } from "@/lib/config";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 300_000, refetchOnWindowFocus: false, retry: 1 } },
});

function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => { reconnect(); }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <AutoReconnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
