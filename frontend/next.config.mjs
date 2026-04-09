/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/nft-images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/metadata/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/samples/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/logo.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800,
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "**.ipfs.dweb.link" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
    ],
  },

  // Ensure metadata JSON files are included in the serverless function bundle
  outputFileTracingIncludes: {
    "/api/metadata/\\[id\\]": ["./public/metadata/**"],
  },

  experimental: {
    optimizePackageImports: ["wagmi", "viem", "@tanstack/react-query"],
  },

  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    config.infrastructureLogging = { level: "error" };
    return config;
  },
};

export default nextConfig;
