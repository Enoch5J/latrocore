import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const certPath = path.resolve(__dirname, '../backend/cert.pem')
const keyPath = path.resolve(__dirname, '../backend/key.pem')

export default defineConfig(({ mode }) => {
  const isHttpsMode = process.env.VITE_HTTPS === 'true' || mode === 'https'
  const useLocalHttps =
    isHttpsMode &&
    fs.existsSync(certPath) &&
    fs.existsSync(keyPath)

  const useBackendHttps =
    process.env.VITE_BACKEND_HTTPS === 'true' ||
    (mode === 'https' && process.env.VITE_BACKEND_HTTPS !== 'false')

  const backendTarget =
    process.env.VITE_BACKEND_URL ||
    (useBackendHttps ? 'https://127.0.0.1:8000' : 'http://127.0.0.1:8000')

  const proxyRule = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      https: useLocalHttps
        ? {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          }
        : undefined,
      proxy: {
        '/auth': proxyRule,
        '/admin': proxyRule,
        '/dashboard': proxyRule,
        '/api': proxyRule,
        '/uploads': proxyRule,
      },
    },
  }
})
