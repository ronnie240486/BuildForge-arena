import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow larger multipart bodies for ZIP uploads (defense-in-depth).
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
