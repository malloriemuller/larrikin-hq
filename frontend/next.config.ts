import type { NextConfig } from "next";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const API_URL =
  rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")
    ? rawApiUrl
    : `https://${rawApiUrl}`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/webhooks/:path*",
        destination: `${API_URL}/webhooks/:path*`,
      },
    ];
  },
};

export default nextConfig;
