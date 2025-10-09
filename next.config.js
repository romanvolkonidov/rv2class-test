/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Electron: We'll run Next.js dev server or deployed version
  // Static export doesn't work with API routes
  reactStrictMode: true,
}

module.exports = nextConfig
