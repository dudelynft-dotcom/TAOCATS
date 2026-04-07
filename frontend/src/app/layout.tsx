import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TAO CAT | 4,699 Pixel Cats on Bittensor EVM",
  description: "4,699 generative pixel cats. The first NFT collection on Bittensor EVM (Chain 964). No whitelist, no team allocation, equal access for everyone.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
