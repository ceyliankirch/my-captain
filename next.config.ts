import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cette ligne vide indique à Next.js de ne pas paniquer 
  // face à la configuration Webpack de next-pwa
  experimental: {
    turbopack: {},
  }
};

export default withPWA(nextConfig);