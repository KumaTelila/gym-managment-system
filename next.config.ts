import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker container builds; native serverless for Vercel
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
};

export default nextConfig;
