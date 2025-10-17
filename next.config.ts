import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled experimental PPR to test deployment manifest generation reliability on Vercel.
  // experimental: { ppr: true },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default nextConfig;
