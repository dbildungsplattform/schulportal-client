import { expect, test } from 'vitest';
import { VueWrapper, enableAutoUnmount, flushPromises, mount, type DOMWrapper } from '@vue/test-utils';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { useSearchFilterStore } from '@/stores/SearchFilterStore';
import { DoFactory } from 'test/DoFactory';
import { nextTick, type Component, type ComponentInstance } from 'vue';
import SchultraegerManagementView from './SchultraegerManagementView.vue';

enableAutoUnmount(afterEach);

type TestContext = {
  wrapper: VueWrapper<ComponentInstance<typeof SchultraegerManagementView>>;
  organisationStore: OrganisationStore;
};

const setup = async (): Promise<TestContext> => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  const organisationStore: OrganisationStore = useOrganisationStore();
  organisationStore.$reset();
  useSearchFilterStore().$reset();

  organisationStore.allSchultraeger = [
    DoFactory.getOrganisation({ name: 'Schultraeger 1', typ: OrganisationsTyp.Traeger }),
    DoFactory.getOrganisation({ name: 'Schultraeger 2', typ: OrganisationsTyp.Traeger }),
  ];

  organisationStore.totalSchultraeger = organisationStore.allSchultraeger.length;

  const wrapper: VueWrapper<ComponentInstance<typeof SchultraegerManagementView>> = mount(SchultraegerManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        SchultraegerManagementView: SchultraegerManagementView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
        },
      },
      provide: {
        organisationStore,
      },
    },
  });
  await flushPromises();

  return { wrapper, organisationStore };
};

describe('SchultraegerManagementView', () => {
  test('it renders Schultraeger management view', async () => {
    const { wrapper, organisationStore }: TestContext = await setup();
    expect(wrapper.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper.find('[data-testid="schultraeger-table"]').isVisible()).toBe(true);
    const rows: DOMWrapper<Element>[] = wrapper.findAll('.v-data-table__tr');
    expect(rows).toHaveLength(organisationStore.allSchultraeger.length);
    expect(rows.map((row: DOMWrapper<Element>) => row.get('.ellipsis-wrapper').text())).toEqual(
      organisationStore.allSchultraeger.map((schultraeger: Organisation) => schultraeger.name),
    );
    expect(rows.map((row: DOMWrapper<Element>) => row.get('.ellipsis-wrapper').attributes('title'))).toEqual(
      organisationStore.allSchultraeger.map((schultraeger: Organisation) => schultraeger.name),
    );
  });

  test('it reloads data after changing page', async () => {
    const { wrapper, organisationStore }: TestContext = await setup();
    expect(wrapper.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper.find('.v-data-table-footer__info').text()).toContain('1-2');

    organisationStore.totalSchultraeger = 50;
    await nextTick();

    expect(wrapper.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper.find('.v-data-table-footer__info').text()).toContain('31-50');
  });

  test('it reloads data after changing limit', async () => {
    const { wrapper, organisationStore }: TestContext = await setup();
    /* check for both cases, first if total is greater than, afterwards if total is less or equal than chosen limit */
    organisationStore.totalOrganisationen = 51;
    await nextTick();

    expect(wrapper.find('.v-data-table-footer__items-per-page').isVisible()).toBe(true);
    expect(wrapper.find('.v-data-table-footer__items-per-page').text()).toContain('30');

    const itemsPerPageSelection: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await itemsPerPageSelection.setValue(50);

    expect(wrapper.find('.v-data-table-footer__items-per-page').text()).toContain('50');

    organisationStore.totalOrganisationen = 30;
    await itemsPerPageSelection.setValue(30);

    expect(wrapper.find('.v-data-table-footer__items-per-page').text()).toContain('30');
  });
});
