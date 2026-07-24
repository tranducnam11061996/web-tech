import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const internalApiBase = (process.env.API_INTERNAL_URL || "http://localhost:3000").replace(/\/+$/, "");
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.google.com https://www.gstatic.com`,
  "frame-src https://www.google.com https://www.youtube-nocookie.com",
  "connect-src 'self' https://www.google.com",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hacom.vn',
      },
      {
        protocol: 'https',
        hostname: 'pcmarket.vn',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ] }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiBase}/api/:path*`,
      },
    ];
  }
};

export default nextConfig;
