/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Performance ────────────────────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "**.ipfs.dweb.link" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
    ],
  },

  // ── Experimental speed boosts ──────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["framer-motion", "wagmi", "viem"],
  },

  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // Suppress large wagmi/WalletConnect warnings in dev
    config.infrastructureLogging = { level: "error" };

    return config;
  },
};

export default nextConfig;
