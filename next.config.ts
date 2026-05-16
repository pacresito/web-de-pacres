import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/home', destination: '/' },
      { source: '/home/minimalista', destination: '/' },
    ];
  },
};

export default nextConfig;
