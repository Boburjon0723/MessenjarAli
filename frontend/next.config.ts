import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Turbopack boshqa joydagi (masalan, user home) package-lock.json ni ildiz deb olmasin */
const configDir = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  turbopack: {
    root: configDir,
  },
  output: isProd ? 'export' : undefined,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-production-ad05.up.railway.app',
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'backend-production-ad05.up.railway.app',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
