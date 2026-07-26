import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed serverExternalPackages as it breaks Vercel's NFT tracing for firebase-admin
};

export default nextConfig;
