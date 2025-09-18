import { defineConfig, type ViteDevServer } from 'vite'
import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev'
import UnoCSS from 'unocss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import tsconfigPaths from 'vite-tsconfig-paths'
import * as dotenv from 'dotenv'

// Load environment variables from multiple files
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
dotenv.config()

export default defineConfig((config) => {
  return {
    base: '/coder',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['all'],
    },
    build: {
      target: 'esnext',
    },
    plugins: [
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
        protocolImports: true,
        exclude: ['child_process', 'fs', 'path'],
      }),
      {
        name: 'buffer-polyfill',
        transform(code, id) {
          if (id.includes('env.mjs')) {
            return {
              code: `import { Buffer } from 'buffer';\n${code}`,
              map: null,
            }
          }
          return null
        },
      },
      config.mode !== 'test' && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
        basename: '/coder',
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      chatRedirectPlugin(),
      disableHostCheckPlugin(), // 👈 added here
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
    envPrefix: [
      'VITE_',
      'OPENAI_LIKE_API_BASE_URL',
      'OLLAMA_API_BASE_URL',
      'LMSTUDIO_API_BASE_URL',
      'TOGETHER_API_BASE_URL',
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    test: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/preview/**',
      ],
    },
  }
})

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./)
        if (raw) {
          const version = parseInt(raw[2], 10)
          if (version === 129) {
            res.setHeader('content-type', 'text/html')
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            )
            return
          }
        }
        next()
      })
    },
  };
}

function chatRedirectPlugin() {
  return {
    name: 'chatRedirectPlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        // Rediriger /chat/{id} vers /coder/chat/{id}
        if (req.url && req.url.match(/^\/chat\/[^\/]+$/)) {
          res.writeHead(301, { Location: `/coder${req.url}` });
          res.end();
          return;
        }

        // Rediriger / vers /coder/
        if (req.url === '/' || req.url === '') {
          res.writeHead(301, { Location: '/coder' });
          res.end();
          return;
        }

        next();
      });
    },
  };
}

// 👇 new plugin to bypass host checks
function disableHostCheckPlugin() {
  return {
    name: 'disable-host-check',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        // Force host header to localhost so Vite won't block it
        req.headers['host'] = 'localhost'
        next()
      })
    },
  }
}
