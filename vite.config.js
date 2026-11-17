import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        setup: resolve(__dirname, 'setup.html'),
        game: resolve(__dirname, 'game.html'),
        result: resolve(__dirname, 'result.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminIndex: resolve(__dirname, 'admin/index.html'),
        adminEditor: resolve(__dirname, 'admin/editor.html'),
      },
    },
  },
});
