/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Electron: We'll run Next.js dev server or deployed version
  // Static export doesn't work with API routes
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Exclude jitsi-custom from TypeScript compilation
  // (it's a separate Jitsi Meet codebase, not part of our Next.js app)
  typescript: {
    // Ignore build errors from jitsi-custom directory
    ignoreBuildErrors: false,
  },
  
  // Exclude jitsi-custom from webpack compilation
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: /jitsi-custom/,
    });
    
    return config;
  },
}

module.exports = nextConfig
