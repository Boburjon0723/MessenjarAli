import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { BACKEND_PUBLIC_ORIGIN } from "./src/lib/backend-origin";

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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || BACKEND_PUBLIC_ORIGIN,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(BACKEND_PUBLIC_ORIGIN).hostname,
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
