import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'sqlite3', '@google/generative-ai'],
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
      'pdf-parse': 'commonjs pdf-parse',
      'sqlite3': 'commonjs sqlite3',
      '@google/generative-ai': 'commonjs @google/generative-ai'
    });
    
    // Node.js 모듈 fallback 설정
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false
    };
    
    return config;
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
