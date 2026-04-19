import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eoimages.gsfc.nasa.gov',
      },
    ],
  },
}

export default nextConfig
