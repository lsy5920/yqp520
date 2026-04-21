import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 这里读取部署根路径，方便本地开发和 GitHub Pages 使用不同 base。
const deployBasePath = process.env.VITE_BASE_PATH || '/'

// 这里导出 Vite 配置，统一处理插件和路径别名。
export default defineConfig({
  base: deployBasePath,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
