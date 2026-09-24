import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  // CSP disuntikkan ke index.html HANYA saat build produksi dan bila
  // CSP_ENABLED=true. Ini menjaga HMR dev (butuh ws: dan inline) tetap jalan.
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
    "frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
    `connect-src 'self' ${apiBase} https://app.sandbox.midtrans.com https://app.midtrans.com`,
  ].join('; ')

  const injectCsp = {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`,
      )
    },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(env.CSP_ENABLED === 'true' ? [injectCsp] : []),
    ],
  }
})
