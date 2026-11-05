import { createVuetify, type ThemeDefinition, type VuetifyOptions } from 'vuetify';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { useI18n } from 'vue-i18n';
import i18n from '@/plugins/i18n';
import '@mdi/font/css/materialdesignicons.css';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import '@/styles/main.scss';

// eslint-disable-next-line no-var
declare var cspNonce: string;

const shTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    'background-grey': '#e5eaef',
    surface: '#FFFFFF',
    primary: '#001e49',
    'primary-darken-1': '#3700B3',
    secondary: '#03DAC6',
    'secondary-darken-1': '#018786',
    error: '#d4004b',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9825',
    errorLight: '#FF5555',
  },
};

const vuetifyConfig: VuetifyOptions = {
  // Restore Vuetify 3 breakpoints so responsive utility classes (mt-md-*, px-lg-*, etc.)
  // and media queries in component <style> blocks continue to work as before.
  display: {
    thresholds: {
      md: 960,
      lg: 1280,
      xl: 1920,
      xxl: 2560,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  theme: {
    cspNonce,
    defaultTheme: 'shTheme',
    themes: {
      shTheme,
    },
  },
};

export default createVuetify(vuetifyConfig);
