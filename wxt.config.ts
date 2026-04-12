import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab', 'sidePanel', 'scripting', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
});
