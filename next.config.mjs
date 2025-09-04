
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'


const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
        config.plugins = [...config.plugins, new PrismaPlugin()]
    }
    return config
  }
};

export default nextConfig;
