import routes from '@/router/routes';
import {
  OrganisationsTyp,
  SchuleTableItem,
  useOrganisationStore,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { VueWrapper, mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import SchuleManagementView from './SchuleManagementView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
let organisationStore: OrganisationStore;

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

  organisationStore = useOrganisationStore();

  organisationStore.allSchulen = [
    {
      id: '9876',
      name: 'Random Schulname Gymnasium',
      kennung: '9356494',
      namensergaenzung: 'Schule',
      kuerzel: 'rsg',
      typ: OrganisationsTyp.Schule,
      administriertVon: '1',
      emailAdress: 'test@example.com',
    },
    {
      id: '1123',
      name: 'Albert-Emil-Hansebrot-Gymnasium',
      kennung: '2745475',
      namensergaenzung: 'Schule',
      kuerzel: 'aehg',
      typ: OrganisationsTyp.Schule,
      administriertVon: '1',
    },
  ];

  organisationStore.totalSchulen = 2;

  wrapper = mount(SchuleManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        SchuleManagementView: SchuleManagementView as Component,
      },
      plugins: [router],
      provide: {
        organisationStore,
      },
    },
  });
});

describe('SchuleManagementView', () => {
  test('it renders schule management view', () => {
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="schule-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(2);
    expect(wrapper?.findAll('[data-testid="open-schule-itslearning-sync-dialog-icon"]').length).toBe(2);
    expect(wrapper?.findAll('[data-testid="open-schule-delete-dialog-icon"]').length).toBe(2);
  });

  describe('when table is rendered', () => {
    test('it should have all columns', () => {
      const columns: ReturnType<VueWrapper['findAll']> | undefined = wrapper?.findAll('.v-data-table__thead th');
      expect(columns?.length).toBe(6);
    });

    test('it should render all school rows correctly', () => {
      const rows: ReturnType<VueWrapper['findAll']> = wrapper?.findAll('.v-data-table__tr') as ReturnType<
        VueWrapper['findAll']
      >;

      const expectedRows: Partial<SchuleTableItem>[] = [
        {
          kennung: '9356494',
          name: 'Random Schulname Gymnasium',
          emailAdress: 'test@example.com',
        },
        {
          kennung: '2745475',
          name: 'Albert-Emil-Hansebrot-Gymnasium',
          emailAdress: '',
        },
      ];

      expect(rows).toHaveLength(expectedRows.length);

      expectedRows.forEach((expectedRow, index) => {
        const cells: ReturnType<VueWrapper['findAll']> = rows[index]?.findAll('td') as ReturnType<
          VueWrapper['findAll']
        >;

        expect(cells[1]?.text()).toBe(expectedRow.kennung);
        expect(cells[2]?.text()).toBe(expectedRow.name);
        expect(cells[3]?.text()).toBe(expectedRow.emailAdress);
        expect(cells[4]?.find('.v-icon.mdi-power').exists()).toBe(true);
        expect(cells[5]?.find('.v-icon.mdi-delete').exists()).toBe(true);
      });
    });
  });

  test('it should redirect after clicking on first row', async () => {
    const firstRow: ReturnType<VueWrapper['find']> | undefined = wrapper?.find('.v-data-table__tr');
    const spyRedirect: ReturnType<typeof vitest.spyOn> = vitest.spyOn(router, 'push');

    await firstRow?.trigger('click');
    expect(spyRedirect).toHaveBeenCalledWith({
      name: 'schule-details',
      params: {
        id: '9876',
      },
    });
  });

  test('it reloads data after changing page', async () => {
    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-2');

    organisationStore.totalSchulen = 50;
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
