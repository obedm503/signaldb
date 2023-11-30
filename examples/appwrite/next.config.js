/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/examples/appwrite',
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig