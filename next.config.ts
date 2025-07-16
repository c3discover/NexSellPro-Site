import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tell Next.js where to find pages
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configure directory structure
  distDir: '.next',
  // Enable source maps only in development for security
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
};

export default nextConfig;
