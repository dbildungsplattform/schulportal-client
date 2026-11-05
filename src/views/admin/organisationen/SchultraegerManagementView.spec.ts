import { expect, test } from 'vitest';
import { VueWrapper, mount } from '@vue/test-utils';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { nextTick, type Component } from 'vue';
import SchultraegerManagementView from './SchultraegerManagementView.vue';

let wrapper: VueWrapper | null = null;
let organisationStore: OrganisationStore;

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  organisationStore = useOrganisationStore();

  organisationStore.allSchultraeger = [
    {
      id: '9876',
      name: 'Schultraeger 1',
      kennung: '9356494',
      namensergaenzung: 'Traeger',
      kuerzel: 'rsg',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    },
    {
      id: '1123',
      name: 'Schultraeger 2',
      kennung: '2745475',
      namensergaenzung: 'Traeger',
      kuerzel: 'aehg',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    },
  ];

  organisationStore.totalSchultraeger = 2;

  wrapper = mount(SchultraegerManagementView, {
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
});

describe('SchultraegerManagementView', () => {
  test('it renders Schultraeger management view', () => {
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="schultraeger-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(2);
  });

  test('it reloads data after changing page', async () => {
    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-2');

    organisationStore.totalSchultraeger = 50;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('31-50');
  });

  test('it reloads data after changing limit', async () => {
    /* check for both cases, first if total is greater than, afterwards if total is less or equal than chosen limit */
    organisationStore.totalOrganisationen = 51;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__items-per-page').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');

    const itemsPerPageSelection: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await itemsPerPageSelection?.setValue(50);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('50');

    organisationStore.totalOrganisationen = 30;
    await itemsPerPageSelection?.setValue(30);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');
    organisationStore.totalOrganisationen = 3;
  });
});
