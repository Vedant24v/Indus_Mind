import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const pythonServiceUrl =
      process.env.PYTHON_SERVICE_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/py/:path*",
        destination: `${pythonServiceUrl}/api/py/:path*`,
      },
    ];
  },
};

export default nextConfig;
