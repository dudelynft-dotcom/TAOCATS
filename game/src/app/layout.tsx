import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAT HEIST — TAO Cats Game",
  description: "The ultimate NFT heist game. Assemble your crew. Rob vaults. Earn $BITCAT.",
  openGraph: {
    title: "CAT HEIST",
    description: "Assemble your crew. Rob vaults. Earn $BITCAT.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
