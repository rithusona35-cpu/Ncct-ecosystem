import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
