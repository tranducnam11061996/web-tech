import type { NextConfig } from "next";

const scriptSource = process.env.NODE_ENV === 'production'
  ? "script-src 'self' 'unsafe-inline' blob: https://www.google.com https://www.gstatic.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.google.com https://www.gstatic.com";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'hacom.vn',
      },
      {
        protocol: 'https',
        hostname: 'pcmarket.vn',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: `default-src 'self'; ${scriptSource}; frame-src https://www.google.com; connect-src 'self' https://www.google.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'` },
    ] }];
  },
};

export default nextConfig;
