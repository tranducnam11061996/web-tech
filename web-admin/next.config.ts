import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'hacom.vn',
      },
    ],
  },
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
  },
};

export default nextConfig;
