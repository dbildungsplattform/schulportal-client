import routes from '@/router/routes';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import UnknownUserErrorView from './UnknownUserErrorView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;

beforeEach(async () => {
  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(UnknownUserErrorView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        UnknownUserErrorView: UnknownUserErrorView as Component,
      },
      plugins: [router],
    },
  });
});

describe('UnknownUserErrorView', () => {
  test('it renders the error card', () => {
    const alertTitle: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid$="alert-title"]');

    expect(alertTitle?.isVisible()).toBe(true);
    expect(alertTitle?.text()).toEqual('Unbekannter Benutzer');
  });

  test('it renders the error description', () => {
    const alertTitle: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid$="alert-text"]');

    expect(alertTitle?.isVisible()).toBe(true);
    expect(alertTitle?.text()).toEqual('Der Benutzer ist im Schulportal SH nicht bekannt');
  });

  test('it renders the logout button', async () => {
    const logoutButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid$="alert-button"]');

    expect(logoutButton?.isVisible()).toBe(true);
    expect(logoutButton?.text()).toEqual('Abmelden');

    await logoutButton?.trigger('click');
    await nextTick();
  });
});
