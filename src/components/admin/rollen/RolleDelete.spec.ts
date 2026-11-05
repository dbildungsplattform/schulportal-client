import { afterEach, expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import RolleDelete from './RolleDelete.vue';
import { RollenMerkmal, RollenSystemRecht } from '@/stores/RolleStore';
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

  wrapper = mount(RolleDelete, {
    attachTo: document.getElementById('app') || '',
    props: {
      isLoading: false,
      errorCode: '',
      rolle: {
        id: '1',
        administeredBySchulstrukturknoten: '3',
        merkmale: [RollenMerkmal.KopersPflicht],
        name: 'Rolle 1',
        rollenart: 'LERN',
        systemrechte: new Set<RollenSystemRecht>(),
        version: 1,
      },
    },
    global: {
      components: {
        RolleDelete: RolleDelete as Component,
      },
      plugins: [router],
    },
  });
  await flushPromises();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('delete rolle', () => {
  test('it opens and closes the dialog', async () => {
    await wrapper?.find('[data-testid="open-rolle-delete-dialog-button"]').trigger('click');
    await flushPromises();

    document.querySelector('[data-testid="rolle-delete-confirmation-text"]');
    expect(document.querySelector('[data-testid="rolle-delete-confirmation-text"]')).not.toBeNull();

    const cancelDeleteButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="cancel-rolle-delete-button"]',
    )[0];
    cancelDeleteButton?.click();
    await nextTick();

    expect(document.querySelector('[data-testid="close-rolle-delete-dialog-button"]')).toBeNull();
  });

  test('it deletes a rolle and navigates back to management', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');

    await wrapper?.find('[data-testid="open-rolle-delete-dialog-button"]').trigger('click');
    await flushPromises();

    document.querySelector('[data-testid="rolle-delete-confirmation-text"]');
    expect(document.querySelector('[data-testid="rolle-delete-confirmation-text"]')).not.toBeNull();

    const rolleDeleteButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="rolle-delete-button"]',
    )[0];
    rolleDeleteButton?.click();
    await nextTick();

    document.querySelector('[data-testid="rolle-delete-success-text"]');
    expect(document.querySelector('[data-testid="rolle-delete-success-text"]')).not.toBeNull();

    const closeDialogButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="close-rolle-delete-success-dialog-button"]',
    )[0];
    closeDialogButton?.click();
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
  });
});
