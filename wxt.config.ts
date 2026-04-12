import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab', 'sidePanel', 'scripting', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
});
