import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
