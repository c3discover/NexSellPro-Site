import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  srcDir: "src", // 👈 add this 
  output: "export", // 👈 add this 
  images: {
    unoptimized: true, // 👈 add this 
  },
  trailingSlash: true, // 👈 add this 
  swcMinify: true, // 👈 add this   

  // Enable React Strict Mode for better development experience and catching potential issues
  reactStrictMode: true,

  // Tell Next.js where to find pages (allows .ts, .tsx, .js, .jsx files to be treated as pages)
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Configure the build output directory (where Next.js puts the built files)
  distDir: '.next',

  // Enable source maps only in development for security (prevents exposing source code in production)
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',

  // SWC minification is enabled by default in Next.js 15+
  // SWC is a Rust-based compiler that's much faster than Terser

  // Disable TypeScript type checking during build for faster builds
  // You can run type checking separately with: npx tsc --noEmit
  typescript: {
    // This will ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },

  // Disable ESLint during build for faster builds
  // You can run linting separately with: npm run lint
  eslint: {
    // This will ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },

  // Enable experimental features for better performance
  experimental: {
    // Enable turbotrace for faster cold starts and better tree shaking
    // This helps reduce bundle size by removing unused code more effectively
    // Note: turbotrace is enabled by default in newer Next.js versions
  },

  // Configure modular imports for better tree shaking and smaller bundles
  // This helps reduce bundle size by only importing what you actually use
  modularizeImports: {
    // Example: If you were using a UI library like @headlessui/react
    // '@headlessui/react': {
    //   transform: '@headlessui/react/{{member}}',
    // },
    // Example: If you were using an icon library like lucide-react
    // 'lucide-react': {
    //   transform: 'lucide-react/dist/esm/icons/{{member}}',
    // },
  },
};

export default nextConfig;
