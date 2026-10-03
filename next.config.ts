import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iPhone が LAN IP で開くと Origin が 192.168.* になり、未許可だと /_next の JS が 403 になる。
  // ログイン form は Client Action 経由のため、JS が無いと signIn が走らない。
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
