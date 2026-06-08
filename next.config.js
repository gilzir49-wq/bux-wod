/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so it can be hosted on Cloudflare Pages / GitHub Pages.
  output: 'export',
  // Emit /path/index.html so static hosts serve clean URLs.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // For GitHub Pages project sites the app is served from /<repo>.
  // Set NEXT_PUBLIC_BASE_PATH="/bux-wod" before building for that case.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  reactStrictMode: true,
};

module.exports = nextConfig;
