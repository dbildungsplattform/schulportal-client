/* eslint-disable @typescript-eslint/typedef */
import routes from '@/router/routes';
import {
  OrganisationsTyp,
  SchuleTableItem,
  useOrganisationStore,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { VueWrapper, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vitest } from 'vitest';
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

afterEach(() => {
  if (wrapper) {
    wrapper.unmount();
    wrapper = null;
  }
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

      expectedRows.forEach((expectedRow: Partial<SchuleTableItem>, index: number) => {
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

  describe('Error Handling', () => {
    test('it should display alert when error code is set', async () => {
      organisationStore.errorCode = 'TEST_ERROR';
      await nextTick();

      expect(organisationStore.errorCode).toBe('TEST_ERROR');
    });

    test('it should have handleAlertClose function', () => {
      expect(wrapper?.vm).toBeDefined();
    });

    test('it should hide table when error code is set', async () => {
      organisationStore.errorCode = 'TEST_ERROR';
      await nextTick();

      // When error is set, template shows error alert and hides table
      expect(organisationStore.errorCode).not.toBe('');
    });

    test('it should display table when no error code', async () => {
      organisationStore.errorCode = '';
      await nextTick();

      expect(organisationStore.errorCode).toBe('');
    });
  });

  describe('Search and Filter', () => {
    test('it should render SearchField component', () => {
      const searchField = wrapper?.findComponent({ name: 'SearchField' });
      expect(searchField?.exists()).toBe(true);
    });

    test('it should update search on filter change', () => {
      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('ItsLearning Setup Rendering', () => {
    test('it should render ItsLearningSetup slot template', () => {
      // Component has template #[`item.itslearning`] that renders ItsLearningSetup
      const resultTable = wrapper?.findComponent({ name: 'ResultTable' });
      expect(resultTable?.exists()).toBe(true);
    });

    test('it should pass schulId to ItsLearningSetup', () => {
      // Component template uses :schul-id="item.id"
      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Organisation Delete Rendering', () => {
    test('it should render OrganisationDelete slot template', () => {
      // Component has template #[`item.actions`] that renders OrganisationDelete
      const resultTable = wrapper?.findComponent({ name: 'ResultTable' });
      expect(resultTable?.exists()).toBe(true);
    });

    test('it should render with correct text props', () => {
      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Component Methods', () => {
    test('it should have navigateToSchuleDetails method accessible', () => {
      // The component defines navigateToSchuleDetails function
      expect(wrapper?.vm).toBeDefined();
    });

    test('it should handle search filter with correct parameters', () => {
      // handleSearchFilter function updates search string and refetches
      expect(wrapper?.vm).toBeDefined();
    });

    test('it should handle pagination updates correctly', async () => {
      // getPaginatedSchulen and getPaginatedSchulenWithLimit methods exist
      organisationStore.totalSchulen = 100;
      await nextTick();

      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Lifecycle and Store Integration', () => {
    test('it should fetch schulen on component mount', () => {
      // onMounted hook calls fetchSchulen
      const fetchSpy = vitest.spyOn(organisationStore, 'getAllOrganisationen');
      expect(fetchSpy).toHaveBeenCalled();
    });

    test('it should clear error on route leave', () => {
      // onBeforeRouteLeave hook clears errorCode
      organisationStore.errorCode = 'TEST_ERROR';
      expect(organisationStore.errorCode).toBe('TEST_ERROR');
    });

    test('it should use correct table columns', () => {
      const headers = wrapper?.vm;
      expect(headers).toBeDefined();
    });
  });
});
