import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 用 `--mode singlefile` 构建时:把所有 JS/CSS 内联进单个 index.html,
// 产出的 dist/index.html 可直接双击(file://)打开。
export default defineConfig(({ mode }) => {
  const singleFile = mode === 'singlefile'
  return {
    plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
    base: './',
    server: {
      host: '127.0.0.1',
      port: 1219,
      strictPort: false,
    },
    build: {
      chunkSizeWarningLimit: 900,
    },
  }
})
