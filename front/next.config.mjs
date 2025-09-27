/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境优化
  productionBrowserSourceMaps: false, // 禁用生产环境的 source maps
  swcMinify: true, // 使用 SWC 进行代码压缩
  compress: true, // 启用 gzip 压缩
  
  // 构建优化
  poweredByHeader: false, // 移除 X-Powered-By header
  reactStrictMode: true, // 启用严格模式以提前发现问题
  
  // 缓存优化
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 增加缓存时间为1小时
    pagesBufferLength: 5, // 同时保持缓存的页面数
  },

  // 图片优化
  images: {
    minimumCacheTTL: 60, // 图片缓存时间
    formats: ['image/webp'], // 优先使用 webp 格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // 优化图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // 优化图片尺寸
  },

  // 编译优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 生产环境移除 console
  },

  // webpack 优化
  webpack: (config, { dev, isServer }) => {
    // 生产环境特定优化
    if (!dev) {
      // 优化 CSS
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    return config
  },

  // 开发时错误检查可以关闭以提升构建速度
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
