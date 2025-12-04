import { defineConfig, type ViteDevServer } from 'vite'
import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev'
import UnoCSS from 'unocss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import tsconfigPaths from 'vite-tsconfig-paths'
import * as dotenv from 'dotenv'
import { env } from 'node:process'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

// Load environment variables from multiple files
// Note: override: false ensures that existing env vars take precedence
// Load in order: .env.production -> .env -> .env.local
const envFiles = ['.env.production', '.env', '.env.local'];

for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: false });
    if (result.error) {
      console.warn(`⚠️  Warning loading ${envFile}:`, result.error.message);
    } else if (result.parsed) {
      console.log(`✅ Loaded ${envFile} (${Object.keys(result.parsed).length} variables)`);
    }
  }
}

// Debug: Log VITE_GATEWAY_URL if it exists (for troubleshooting)
if (process.env.VITE_GATEWAY_URL) {
  console.log('✅ VITE_GATEWAY_URL loaded:', process.env.VITE_GATEWAY_URL);
} else {
  console.warn('⚠️  VITE_GATEWAY_URL not found in environment variables');
  console.warn('   Vérifiez que VITE_GATEWAY_URL est défini dans .env, .env.local ou .env.production');
}

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
      hmr: false,
      proxy: {
        '/api/gateway': {
          target: (() => {
            // Try multiple sources for the gateway URL
            const gatewayUrl =
              process.env.VITE_GATEWAY_URL ||
              process.env.GATEWAY_URL ||
              '';

            if (!gatewayUrl) {
              console.error(
                "❌ ERREUR: La variable d'environnement VITE_GATEWAY_URL n'est pas définie.\n" +
                  "   Veuillez l'ajouter dans votre fichier .env, .env.local ou .env.production avec:\n" +
                  "   VITE_GATEWAY_URL=https://votre-gateway-url.com\n" +
                  "   Fichiers vérifiés: .env.production, .env, .env.local\n" +
                  "   Valeur actuelle de process.env.VITE_GATEWAY_URL:",
                process.env.VITE_GATEWAY_URL || 'undefined',
              );
            } else {
              console.log('✅ Gateway URL configuré:', gatewayUrl);
            }
            return gatewayUrl;
          })(),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gateway/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
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
      'NEXT_PUBLIC_',
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
