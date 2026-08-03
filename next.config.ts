import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained production server for the portable desktop bundle.
  output: "standalone",
  // Allow this local machine's LAN URL to load development assets and HMR.
  // This only affects `next dev`; production is unchanged.
  allowedDevOrigins: ["192.168.71.180"],
  serverExternalPackages: [],
};

export default nextConfig;
