/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  },
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;
