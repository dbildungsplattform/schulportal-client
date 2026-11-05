import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';
import vuetify from 'vite-plugin-vuetify';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    VueI18nPlugin(),
    vue(),
    vuetify({
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    basicSsl(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      test: fileURLToPath(new URL('./test', import.meta.url)),
    },
  },
  test: {
    testTimeout: 10 * 1000,
    hookTimeout: 15 * 1000,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts'],
    setupFiles: './vitest.setup.ts',
    clearMocks: true,
    coverage: {
      provider: 'istanbul',
      reporter: [['text', { maxCols: 150 }], 'lcov'],
      include: ['src/**'],
      exclude: [
        'src/api-client/**',
        'src/plugins/**',
        'src/services/**',
        'src/specs/**',
        'src/router/**',
        'src/**/**.spec.ts',
        'src/App.vue',
        'src/main.ts',
      ],
      thresholds: {
        // TODO: reset thresholds to 100,
        // so our base coverage will be at 100% and exceptions are defined below
        'src/**/**.*': {
          statements: 70,
          functions: 70,
          branches: 70,
          lines: 70,
        },
        // TODO: reset components threshold to 80 when thresholds can be reached
        'src/components/**/**.vue': {
          statements: 75,
          functions: 75,
          branches: 75,
          lines: 75,
        },
        // TODO: reset thresholds to 80 and write tests for layouts
        // TODO: before we can increase the coverage threshold for layouts, we have to fix the broken layout that result from fixing the tests
        // for more info, see layout specs
        'src/layouts/**/**.vue': {
          statements: 0,
          functions: 0,
          branches: 80,
          lines: 0,
        },
        // TODO: delete stores dir block from thresholds when first block is at 100
        'src/stores/**/**.ts': {
          statements: 100,
          functions: 100,
          // TODO: reset branches threshold to 100 when store error handler is implemented
          branches: 80,
          lines: 100,
        },
        // TODO: reset thresholds to 80 and write tests for utils
        'src/utils/**/**.ts': {
          statements: 70,
          functions: 70,
          branches: 70,
          lines: 70,
        },
        'src/views/**/**.vue': {
          // TODO: reset thresholds to 80 and write tests for views
          statements: 70,
          functions: 70,
          branches: 70,
          lines: 70,
        },
      },
    },
  },
});
