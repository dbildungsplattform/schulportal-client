import routes from '@/router/routes';
import { VueWrapper, enableAutoUnmount, mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { h, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { VApp } from 'vuetify/components';
import TheFooter from './TheFooter.vue';

let wrapper: VueWrapper | null = null;
let router: Router;

enableAutoUnmount(afterEach);

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = mount(VApp, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        TheFooter: TheFooter as Component,
      },
      plugins: [router],
    },
    slots: {
      default: h(TheFooter),
    },
  });
});

describe('TheFooter', () => {
  test('it renders the footer', () => {
    expect(wrapper?.find('[data-testid="footer"]').isVisible()).toBe(true);
  });
});
