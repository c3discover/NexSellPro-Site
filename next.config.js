/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next.js where to find pages
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configure directory structure
  distDir: '.next',
  // Enable source maps for debugging
  productionBrowserSourceMaps: true,
}

module.exports = nextConfig 