import { expect, test, type MockInstance } from 'vitest';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import NotFoundView from './NotFoundView.vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import routes from '@/router/routes';

let wrapper: VueWrapper | null = null;
let router: Router;

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

  wrapper = mount(NotFoundView, {
    props: {
      buttonText: 'Back',
      closable: false,
      modelValue: true,
      showButton: true,
      text: 'Page not found',
      title: '404',
      type: 'error',
    },
    global: {
      plugins: [router],
    },
    attachTo: document.getElementById('app') || '',
  });
});

describe('NotFoundView', () => {
  test('it renders with the correct title and text', () => {
    expect(wrapper?.text()).toContain('404');
    expect(wrapper?.text()).toContain('Page not found');
  });

  test('it navigates to Start Page on button click', async () => {
    const spy: MockInstance = vi.spyOn(router, 'push');
    const button: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find('[data-testid$="alert-button"]');
    expect(button?.isVisible()).toBe(true);
    await button?.trigger('click');
    expect(spy).toHaveBeenCalledWith({ name: 'start' });
  });
});
