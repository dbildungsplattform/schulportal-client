import { expect, test } from 'vitest';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { VApp } from 'vuetify/components';
import { h, type Component } from 'vue';
import TheHeader from './TheHeader.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
import { createRouter, createWebHistory, type Router } from 'vue-router';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { AxiosError, AxiosHeaders } from 'axios';

let authStore: AuthStore;
let mockAdapter: MockAdapter;
let unauthorizedError: AxiosError;

beforeEach(async () => {
  authStore = useAuthStore();
  authStore.$reset();
  mockAdapter = new MockAdapter(axiosApiInstance);
  unauthorizedError = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
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
        TheHeader: TheHeader as Component,
      },
      plugins: [router],
    },
    slots: {
      default: h(TheHeader),
    },
  });
  await flushPromises();
});

afterEach(() => {
  vi.unstubAllGlobals();
  wrapper?.unmount();
  mockAdapter.restore();
});

describe('TheHeader', () => {
  test('it renders the header', () => {
    expect(wrapper?.find('[data-testid="header"]').isVisible()).toBe(true);
  });

  test('should preserve logout navigation when pending requests return unauthorized', async () => {
    authStore.isAuthenticated = true;
    await flushPromises();
    const originalUrl: string = window.location.href;
    let respond: () => void = () => {
      throw new Error('Pending responses have not been initialized');
    };
    const response: Promise<never> = new Promise(
      (_resolve: (value: never) => void, reject: (reason: AxiosError) => void) => {
        respond = (): void => reject(unauthorizedError);
      },
    );
    mockAdapter.onGet('/api/personen').replyOnce(() => response);
    mockAdapter.onGet('/api/organisationen').replyOnce(() => response);
    const requests: Promise<PromiseSettledResult<unknown>[]> = Promise.allSettled([
      axiosApiInstance.get('/api/personen'),
      axiosApiInstance.get('/api/organisationen'),
    ]);
    await flushPromises();

    const logoutLink: Omit<DOMWrapper<Element>, 'exists'> = wrapper!.get('[data-testid="nav-logout-button"]');
    logoutLink.element.addEventListener('click', (event: Event) => event.preventDefault(), { once: true });
    await logoutLink.trigger('click');
    expect(logoutLink.attributes('href')).toBe('/api/auth/logout');
    expect(authStore.isLoggingOut).toBe(true);
    vi.stubGlobal('window', { location: { href: originalUrl } });
    respond();

    const results: PromiseSettledResult<unknown>[] = await requests;
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result).toMatchObject({ status: 'rejected', reason: { response: { status: 401 } } });
    }
    expect(window.location.href).toBe(originalUrl);
  });

  test('should still redirect unauthorized requests to login when not logging out', async () => {
    const originalUrl: string = window.location.href;
    vi.stubGlobal('window', { location: { href: originalUrl } });
    mockAdapter.onGet('/api/personen').replyOnce(() => Promise.reject(unauthorizedError));

    await expect(axiosApiInstance.get('/api/personen')).rejects.toMatchObject({ response: { status: 401 } });

    expect(window.location.href).toBe(`/api/auth/login?redirectUrl=${originalUrl}`);
  });

  test.each(['ctrlKey', 'metaKey', 'shiftKey', 'altKey'])(
    'should not mark the current page as logging out for a %s click',
    async (modifier: string) => {
      authStore.isAuthenticated = true;
      await flushPromises();
      const logoutLink: Omit<DOMWrapper<Element>, 'exists'> = wrapper!.get('[data-testid="nav-logout-button"]');
      logoutLink.element.addEventListener('click', (event: Event) => event.preventDefault(), { once: true });

      await logoutLink.trigger('click', { [modifier]: true });

      expect(authStore.isLoggingOut).toBe(false);
    },
  );
});
