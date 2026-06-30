import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  async rewrites() {
    // On Vercel, Python runs as a serverless function via api/index.py + vercel.json.
    // Only proxy to an external Python service during local development.
    if (process.env.VERCEL) {
      return [];
    }

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
