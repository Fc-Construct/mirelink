import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function syncAssets() {
  try {
    const assetsDir = path.resolve(__dirname, 'assets');
    const publicAssetsDir = path.resolve(__dirname, 'public/assets');

    if (fs.existsSync(assetsDir)) {
      fs.mkdirSync(publicAssetsDir, { recursive: true });
      fs.cpSync(assetsDir, publicAssetsDir, { recursive: true, force: true });
    }

    const readmePath = path.resolve(__dirname, 'README.md');
    const publicReadmePath = path.resolve(__dirname, 'public/README.md');
    if (fs.existsSync(readmePath)) {
      fs.mkdirSync(path.dirname(publicReadmePath), { recursive: true });
      fs.copyFileSync(readmePath, publicReadmePath);
    }
  } catch (e) {
    // Ignore copy errors
  }
}

function autoSyncAssetsPlugin(): Plugin {
  return {
    name: 'auto-sync-assets-plugin',
    buildStart() {
      syncAssets();
    },
    configureServer(server) {
      syncAssets();
      server.middlewares.use((_req, _res, next) => {
        syncAssets();
        next();
      });
    },
  };
}

function autoSyncDataPlugin(): Plugin {
  return {
    name: 'auto-sync-data-plugin',
    buildStart() {
      try {
        execSync('python3 update_phonebook.py', { stdio: 'ignore', timeout: 3000 });
      } catch (e) {
        // Ignore if busy
      }
    },
    configureServer(server) {
      try {
        execSync('python3 update_phonebook.py', { stdio: 'ignore', timeout: 3000 });
      } catch (e) {
        // Ignore if busy
      }
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        // Trigger auto-sync whenever the webpage is loaded or phone_book.json is requested
        if (url === '/' || url === '/index.html' || url === '/data/phone_book.json') {
          try {
            execSync('python3 update_phonebook.py', { stdio: 'ignore', timeout: 2000 });
          } catch (e) {
            // Ignore if busy
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), autoSyncAssetsPlugin(), autoSyncDataPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});