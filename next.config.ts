import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker container builds; native serverless for Vercel
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),

  // F-16: HTTP Security Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
