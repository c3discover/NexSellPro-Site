import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tell Next.js where to find pages
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configure directory structure
  distDir: '.next',
  // Enable source maps for debugging
  productionBrowserSourceMaps: true,
};

export default nextConfig;
