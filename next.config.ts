import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow accessing the dev server from other devices on the LAN (e.g. phone/tablet
  // testing at http://192.168.1.136:3000) without cross-origin HMR being blocked.
  allowedDevOrigins: ["192.168.1.136"],
  // Pin the workspace root to this project silences the "multiple lockfiles"
  // inference warning caused by a stray package-lock.json in the parent folder.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
