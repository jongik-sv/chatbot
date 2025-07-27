import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3'
    });
    return config;
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  }
};

export default nextConfig;
