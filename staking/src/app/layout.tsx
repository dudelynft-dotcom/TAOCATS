import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import "./globals.css";
import Providers from "@/components/Providers";
import { wagmiConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "TAO CAT Staking — Earn $BITCAT",
  description: "Stake your TAO CAT NFTs to earn $BITCAT. Rarity-weighted rewards. Collection bonuses. 90-day Season 1.",
  openGraph: {
    title: "TAO CAT Staking",
    description: "Stake TAO CAT NFTs. Earn $BITCAT. Legendary cats earn 3× base rate.",
    url: "https://staking.taocats.fun",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(wagmiConfig, headers().get("cookie"));
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://taocats.fun/logo.png" />
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
