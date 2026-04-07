import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://taocats.io"),
  title: "TAO Cats | 4,699 Pixel Cats on Bittensor EVM",
  description: "4,699 generative pixel art cats on Bittensor EVM. 6.99 TAO mint. No whitelist. No team tokens.",
  openGraph: {
    title: "TAO Cats",
    description: "4,699 generative pixel cats on Bittensor EVM.",
    images: ["/preview.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
