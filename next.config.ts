import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Prevent Next.js from bundling native modules — they must run in Node.js directly
    serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
