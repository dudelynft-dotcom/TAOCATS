/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "taocats.fun" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
};
module.exports = nextConfig;
