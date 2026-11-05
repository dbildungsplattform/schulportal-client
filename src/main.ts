import { createApp, type Component, type App as VueApp } from 'vue';
import App from './App.vue';
import i18n from './plugins/i18n';
import router from './router';
import vuetify from './plugins/vuetify';
import pinia from './plugins/pinia';
import { useConfigStore, type ConfigStore } from './stores/ConfigStore';

// prettier-ignore
const app: VueApp<Element> = createApp(App as Component)
  .use(i18n)
  .use(pinia)
  .use(router)
  .use(vuetify)

app.mount('#app');

// Fetch feature flags on app startup
const configStore: ConfigStore = useConfigStore();
configStore.getFeatureFlags();
