import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

/**
 * Build modes:
 *   production / development                 -> Chrome build in dist/
 *   firefox / firefox-development            -> Firefox build in dist-firefox/
 */
const FIREFOX_MANIFEST_ADDITIONS = {
  browser_specific_settings: {
    gecko: {
      // Permanent add-on ID on addons.mozilla.org: never change it after the first upload.
      id: 'sound-tools@julienmeziere.github.io',
      // 140 is the first version supporting data_collection_permissions (and the current ESR).
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
    // Firefox for Android only supports data_collection_permissions from 142.
    gecko_android: { strict_min_version: '142.0' },
  },
};

export default defineConfig(({ mode }) => {
  const browser = mode.startsWith('firefox') ? 'firefox' : 'chrome';
  const isDev = mode.endsWith('development');

  const targetManifest =
    browser === 'firefox'
      ? ({ ...manifest, ...FIREFOX_MANIFEST_ADDITIONS } as ManifestV3Export)
      : (manifest as ManifestV3Export);

  return {
    plugins: [react(), crx({ manifest: targetManifest, browser })],
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
    build: {
      outDir: browser === 'firefox' ? 'dist-firefox' : 'dist',
      minify: !isDev,
      sourcemap: isDev,
    },
  };
});
