/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

if (process.env.GITHUB_ACTIONS) {
  nextConfig.output = 'export'
  nextConfig.basePath = '/aws-genai-cicd-suite'
  nextConfig.assetPrefix = '/aws-genai-cicd-suite/'
} else {
  nextConfig.output = 'standalone'
}

module.exports = nextConfig
