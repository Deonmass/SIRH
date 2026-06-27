import type { NextConfig } from "next";

const devAllowedOrigins =
  process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ["192.168.50.48", "172.20.10.3", "login"];

const nextConfig: NextConfig = {
  // Autorise le hot-reload (WebSocket HMR) via IP LAN ou hostname local en dev.
  allowedDevOrigins: devAllowedOrigins,
  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      html2canvas: "html2canvas-pro",
    };
    return config;
  },
};

export default nextConfig;
