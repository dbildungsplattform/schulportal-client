import { config } from '@vue/test-utils';
import { I18n, createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import { beforeAll } from 'vitest';
import { TestingPinia, createTestingPinia } from '@pinia/testing';
import de_locales from './src/locales/de-DE.json';

const i18n: I18n = createI18n({
  fallbackLocale: 'de',
  legacy: false,
  locale: 'de',
  messages: {
    de: de_locales,
  },
});

const vuetify: ReturnType<typeof createVuetify> = createVuetify({});
const pinia: TestingPinia = createTestingPinia();

beforeAll(() => {
  // @ts-expect-error: global has any type
  global.ResizeObserver = class ResizeObserver {
    public observe(): void {
      /* empty */
    }
    public unobserve(): void {
      /* empty */
    }
    public disconnect(): void {
      /* empty */
    }
  };
  // Fix Vuetify >=3.8.7 overlay bug (visualViewport not defined)
  // @ts-expect-error: visualViewport is missing in Node
  global.visualViewport = new EventTarget();
});

config.global.plugins = [i18n, pinia, vuetify];
