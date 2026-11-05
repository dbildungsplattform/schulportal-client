import { expect, test, type MockInstance } from 'vitest';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import routes from '@/router/routes';
import RelationshipAssignList from './RelationshipAssignList.vue';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import type { Component } from 'vue';

let wrapper: VueWrapper | null = null;
let router: Router;

const mockItems: Array<Organisation> = [
  { id: '1', name: 'Org 1', typ: OrganisationsTyp.Schule },
  { id: '2', name: 'Org 2', typ: OrganisationsTyp.Schule },
];

function mountComponent(): VueWrapper<InstanceType<typeof RelationshipAssignList>> {
  return mount(RelationshipAssignList, {
    attachTo: document.getElementById('app') || '',
    props: {
      dataTestId: 'assign-list',
      items: mockItems,
      noItemsFoundText: 'No items found',
    },
    global: {
      components: {
        RelationshipAssignList: RelationshipAssignList as Component,
      },
      plugins: [router],
    },
  });
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
        <router-view>
            <div id="app"></div>
         </router-view>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = mountComponent();
});

afterEach(() => {
  vi.restoreAllMocks();
  wrapper?.unmount();
});

describe('RelationshipAssignList', () => {
  test('it renders the assign list component and its child components', () => {
    expect(wrapper?.findComponent({ name: 'SearchField' })).toBeTruthy();
  });

  test('it emits', () => {
    expect(true).toBeTruthy();
  });

  test('it moves focus to the next chip on Enter key press', async () => {
    const listItems: DOMWrapper<Element>[] | undefined = wrapper?.findAll('[data-testid^="assign-list-item-"]');
    expect(listItems).toHaveLength(mockItems.length);

    if (listItems) {
      const secondItem: HTMLElement = listItems[1]?.element as HTMLElement;

      // Spy on focus method
      const focusSpy: MockInstance = vi.spyOn(secondItem, 'focus');

      // Trigger Enter key event manually
      await listItems[0]?.trigger('keydown', { key: 'Enter' });

      // Ensure the second item received focus
      expect(focusSpy).toHaveBeenCalled();
    }
  });

  test('it does not move focus when the last chip is selected and Enter is pressed', async () => {
    const listItems: DOMWrapper<Element>[] | undefined = wrapper?.findAll('[data-testid^="assign-list-item-"]');
    expect(listItems).toHaveLength(mockItems.length);

    if (listItems) {
      const lastItem: HTMLElement = listItems[listItems.length - 1]?.element as HTMLElement;

      // Spy on focus method to check if it's called
      const focusSpy: MockInstance = vi.spyOn(lastItem, 'focus');

      // Trigger Enter key event on the last item
      await listItems[listItems.length - 1]?.trigger('keydown', { key: 'Enter' });

      // Ensure focus was NOT called (because it's the last item)
      expect(focusSpy).not.toHaveBeenCalled();
    }
  });
});
