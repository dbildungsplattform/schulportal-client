import { RollenSystemRechtEnum } from '@/api-client/generated';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore, type UserInfo } from '@/stores/AuthStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationenFilter,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component, type ComputedRef, type DefineComponent } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import KlassenManagementView from './KlassenManagementView.vue';

let wrapper: VueWrapper | null = null;

async function mountComponent(): Promise<VueWrapper> {
  const router: Router = createRouter({
    history: createWebHistory(),
    routes,
  });
  router.push({ name: 'klasse-management' });
  await router.isReady();
  return mount(KlassenManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        KlassenManagementView: KlassenManagementView as Component,
      },
      plugins: [router],
    },
  });
}

const organisationStore: OrganisationStore = useOrganisationStore();
const searchFilterStore: SearchFilterStore = useSearchFilterStore();
const authStore: AuthStore = useAuthStore();

/**
 *
 * @param schule org to solect, null to clear selection
 * @returns selected org or nothing, if cleared
 */
async function selectSchule(schule?: Partial<Organisation> | null): Promise<Organisation | undefined> {
  const schuleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' }).findComponent({
    name: 'v-autocomplete',
  });

  if (schule === null) {
    await schuleAutocomplete?.setValue(schule);
    return;
  }

  const schuleWithDefaults: Organisation = DoFactory.getSchule(schule);
  organisationStore.organisationenFilters.set('klassen-management', {
    filterResult: [schuleWithDefaults],
    total: 1,
    loading: false,
  });
  searchFilterStore.selectedSchuleForKlassen = schuleWithDefaults.id;
  await schuleAutocomplete?.setValue(schuleWithDefaults.id);
  return schuleWithDefaults;
}

async function selectKlasse(
  klasse: Partial<Organisation> | null,
  schule?: Organisation,
): Promise<Organisation | undefined> {
  const klasseFilterStoreKey: string = '';
  const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' }).findComponent({
    name: 'v-autocomplete',
  });

  if (klasse === null) {
    await klasseAutocomplete?.setValue(null);
    return;
  }

  organisationStore.klassenFilters.set(klasseFilterStoreKey, {
    filterResult: [],
    total: 0,
    loading: false,
  });
  const klasseWithDefaults: Organisation = DoFactory.getKlasse(schule, klasse);
  organisationStore.klassenFilters.get(klasseFilterStoreKey)!.filterResult = [klasseWithDefaults];
  await klasseAutocomplete?.setValue([klasseWithDefaults.id]);
  return klasseWithDefaults;
}

const schule1: Organisation = DoFactory.getSchule();
const schule2: Organisation = DoFactory.getSchule();
const personenkontexte: UserInfo['personenkontexte'] = [
  {
    organisation: {
      ...DoFactory.getOrganisationResponse({
        administriertVon: '1',
        kennung: schule1.kennung ?? '',
      }),
      ...schule1,
    },
    rolle: DoFactory.getRollenSystemRechtServiceProviderIDResponse({
      systemrechte: [RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.SchulenVerwalten],
    }),
  },
  {
    organisation: {
      ...DoFactory.getOrganisationResponse({
        administriertVon: '1',
        kennung: schule2.kennung ?? '',
      }),
      ...schule2,
    },
    rolle: DoFactory.getRollenSystemRechtServiceProviderIDResponse({
      systemrechte: [RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.SchulenVerwalten],
    }),
  },
];
const authUser: UserInfo = DoFactory.getUserinfoResponse();

describe('KlassenManagementView', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
    <div>
        <router-view>
          <div id="app"></div>
        </router-view>
    </div>
  `;

    organisationStore.$reset();
    organisationStore.allKlassen = [
      DoFactory.getKlasse(schule1, { name: '9a', schuleDetails: schule1.name }),
      DoFactory.getKlasse(schule2, { name: '9b', schuleDetails: schule2.name }),
    ];
    organisationStore.errorCode = '';

    organisationStore.allOrganisationen = [schule1, schule2];

    organisationStore.allSchulen = [schule1, schule2];

    organisationStore.totalKlassen = 2;

    organisationStore.getAllOrganisationen = vi.fn();
    organisationStore.getKlassenByOrganisationId = vi.fn();
    organisationStore.deleteOrganisationById = vi.fn();

    authStore.currentUser = authUser;

    organisationStore.klassenFilters.set('klassen-management', {
      total: 42,
      filterResult: [],
      loading: false,
    });

    wrapper = await mountComponent();
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  type AutoselectTestcase = {
    label: string;
    isSchuleAutoselected: boolean;
  };
  const autoselectTestcases: Array<AutoselectTestcase> = [
    {
      label: 'not autoselected',
      isSchuleAutoselected: false,
    },
    {
      label: 'autoselected',
      isSchuleAutoselected: true,
    },
  ];
  describe.each(autoselectTestcases)('when Schule is $label', ({ isSchuleAutoselected }: AutoselectTestcase) => {
    beforeEach(() => {
      authStore.currentUser = {
        ...authUser,
        personenkontexte: isSchuleAutoselected ? personenkontexte.slice(0, 1) : personenkontexte,
      };
    });

    test('it renders klasse management view', async () => {
      wrapper = await mountComponent();
      expect(wrapper.getComponent({ name: 'ResultTable' })).toBeTruthy();
      expect(wrapper.find('[data-testid="klasse-table"]').isVisible()).toBe(true);
      await flushPromises();
      const numberOfRows: number = wrapper.findAll('.v-data-table__tr').length;
      expect(numberOfRows).toBe(organisationStore.allKlassen.length);
      await nextTick();

      const tableHeadersText: string | undefined = wrapper.find('.v-data-table__thead').text();
      const elements: DOMWrapper<Element>[] | undefined = wrapper.findAll('.v-data-table__th');
      if (isSchuleAutoselected) {
        expect(elements.length).toBe(3);
        expect(tableHeadersText).not.toContain('Dienststellennummer');
      } else {
        expect(elements.length).toBe(4);
        expect(tableHeadersText).toContain('Dienststellennummer');
      }
      expect(tableHeadersText).toContain('Klasse');
      expect(tableHeadersText).toContain('Aktion');

      const text: string | undefined = wrapper.text();
      organisationStore.allKlassen.forEach((klasse: Organisation) => {
        expect(text).toContain(klasse.name);
        if (!isSchuleAutoselected) {
          expect(text).toContain(klasse.schuleDetails);
        }
      });
    });
  });
  describe.each([[true], [false]])('when searchFilterStore has data (%s)', (hasStoreData: boolean) => {
    test('it populates filter', async () => {
      searchFilterStore.selectedSchuleForKlassen = hasStoreData ? schule1.id : null;
      organisationStore.organisationenFilters.set('klassen-management', {
        filterResult: [schule1],
        total: 1,
        loading: false,
      });
      await flushPromises();
      wrapper = await mountComponent();
      await flushPromises();
      const organisationAutocomplete: VueWrapper | undefined = wrapper.findComponent({ ref: 'schule-select' });
      if (hasStoreData) {
        expect(organisationAutocomplete.text()).toContain(schule1.name);
      } else {
        expect(organisationAutocomplete.text()).toBe('');
      }
    });
  });

  test('it reloads data after changing page', async () => {
    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-2');

    organisationStore.totalKlassen = 50;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('31-50');

    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' });
    await organisationAutocomplete?.setValue('O1');
    await nextTick();
    await wrapper?.find('.v-pagination__prev button:not(.v-btn--disabled)').trigger('click');

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
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
    organisationStore.totalOrganisationen = 2;

    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' });
    await organisationAutocomplete?.setValue('O1');
    await nextTick();

    await itemsPerPageSelection?.setValue(50);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-2');
  });

  test('it resets field Klasse when Schule is reset after being selected', async () => {
    selectSchule();
    await nextTick();

    const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });
    await klasseAutocomplete?.setValue('9a');
    await nextTick();

    selectSchule(null);
    await flushPromises();

    expect(klasseAutocomplete?.text()).toEqual('');
  });

  test('it triggers reset for filters', async () => {
    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' });
    selectSchule();
    await nextTick();

    const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });
    await klasseAutocomplete?.setValue('9a');
    await nextTick();

    wrapper?.find('[data-testid="reset-filter-button"]').trigger('click');
    await nextTick();

    expect(organisationAutocomplete?.text()).toEqual('');
    expect(klasseAutocomplete?.text()).toEqual('');
  });

  it('should return the total value from klassenFilters if present', () => {
    interface KlassenManagementView extends DefineComponent {
      totalKlassen: ComputedRef<number>;
    }
    const vm: KlassenManagementView = wrapper?.vm as unknown as KlassenManagementView;
    const totalKlassen: ComputedRef<number> = vm.totalKlassen;

    expect(totalKlassen).toBe(42);
  });

  it('should return 0 if klassenFilters does not contain the key', async () => {
    interface KlassenManagementView extends DefineComponent {
      totalKlassen: ComputedRef<number>;
    }

    // The key 'klassen-management' is not set in klassenFilters
    organisationStore.klassenFilters.delete('klassen-management');

    await nextTick();
    await flushPromises();

    const vm: KlassenManagementView = wrapper?.vm as unknown as KlassenManagementView;
    const totalKlassen: ComputedRef<number> = vm.totalKlassen;

    expect(totalKlassen).toBe(0);
  });

  it('should fetch Klassen for selected Schule when search string is empty', async () => {
    const schule: Organisation = (await selectSchule())!;
    const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });

    klasseAutocomplete?.vm.$emit('update:search', '');
    await flushPromises();
    const expectedFilter: OrganisationenFilter = {
      administriertVon: [schule.id],
      includeTyp: OrganisationsTyp.Klasse,
      limit: searchFilterStore.klassenPerPage,
      offset: 0,
      organisationIds: [],
      systemrechte: [RollenSystemRechtEnum.KlassenVerwalten],
    };
    expect(organisationStore.getAllOrganisationen).toHaveBeenLastCalledWith(expectedFilter);
  });

  // This test is currently not working as expected due to limitations with Vuetify's v-autocomplete
  // TODO: Fix this test once we have a reliable way to open Vuetify's menu during tests.
  // it('shows loading spinner when organisationStore.loading is true', async () => {
  //   organisationStore.loading = true;

  //   await nextTick();
  //   await selectSchule();
  //   await nextTick();

  //   const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });

  //   // Try clicking on the menu icon specifically
  //   await klasseAutocomplete?.find('.v-autocomplete__menu-icon').trigger('click');
  //   await nextTick();

  //   const progressIndicator: DOMWrapper<Element> | undefined = klasseAutocomplete?.find(
  //     '[data-testid="klassen-filter-progress"]',
  //   );

  //   expect(progressIndicator?.exists()).toBe(true);
  // });

  test('it searches for klasse', async () => {
    const schule: Organisation = (await selectSchule(schule1))!;
    const klasse: Organisation = organisationStore.allKlassen.find(
      (k: Organisation) => k.administriertVon === schule.id,
    )!;
    await selectKlasse(klasse);

    await flushPromises();
    vi.runAllTimers();

    const text: string | undefined = wrapper?.text();

    expect(text).toContain(klasse.name);
    expect(organisationStore.getAllOrganisationen).toHaveBeenCalledWith({
      includeTyp: OrganisationsTyp.Klasse,
      systemrechte: [RollenSystemRechtEnum.KlassenVerwalten],
      offset: 0,
      limit: searchFilterStore.klassenPerPage,
      organisationIds: [klasse.id],
      administriertVon: [schule.id],
    });
  });

  test('it clears searchfield when losing focus', async () => {
    const searchString: string = organisationStore.allKlassen[0]!.name.substring(0, 1);
    await selectSchule();

    const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });
    const klassenInputElement: DOMWrapper<Element> | undefined = klasseAutocomplete?.find(
      '#klassen-management-klasse-select',
    );

    await klassenInputElement?.setValue(searchString);

    await flushPromises();
    vi.runAllTimers();

    expect((klassenInputElement?.element as HTMLInputElement).value).toBe(searchString);

    await klassenInputElement?.trigger('focus');

    expect((klassenInputElement?.element as HTMLInputElement).value).toBe('');
  });

  test('it does nothing if same schule is selected again', async () => {
    const selectedSchule: Organisation = (await selectSchule())!;

    const allSpy: MockInstance = vi.spyOn(organisationStore, 'getAllOrganisationen');
    allSpy.mockClear();

    expect(allSpy).not.toHaveBeenCalled();

    await selectSchule(selectedSchule);
    await flushPromises();

    expect(allSpy).not.toHaveBeenCalled();
  });

  test.each([
    ['UNSPECIFIED_ERROR', 'Fehler beim Laden der Klassen', 'Es konnten keine Klassendaten geladen werden.'],
    ['KLASSE_ERROR', 'Fehler bei Änderung der Klasse.', 'Die Klasse konnte nicht geändert werden.'],
  ])(
    'if there is an error, it displays correct text for %s',
    async (errorCode: string, expectedTitle: string, expectedText: string) => {
      organisationStore.errorCode = errorCode;
      await nextTick();

      const actualTitle: string | undefined = wrapper?.find('[data-testid$=alert-title]').text();
      const actualText: string | undefined = wrapper?.find('[data-testid$=alert-text]').text();

      expect(actualTitle).toBe(expectedTitle);
      expect(actualText).toBe(expectedText);
    },
  );

  test('it sorts Klassen correctly when changing sort order', async () => {
    // Click to sort descending
    const klasseHeader: DOMWrapper<Element> | undefined = wrapper
      ?.findAll('.v-data-table__th')
      .find((th: DOMWrapper<Element>) => th.text().includes('Klasse'));

    await klasseHeader?.trigger('click');
    await flushPromises();

    expect(organisationStore.getAllOrganisationen).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'name',
        sortOrder: 'desc',
      }),
    );

    // click again to sort ascending
    await klasseHeader?.trigger('click');
    await flushPromises();
    expect(organisationStore.getAllOrganisationen).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'name',
        sortOrder: 'asc',
      }),
    );
  });

  test('it should call deleteOrganisationById when deleting a Klasse', async () => {
    await wrapper?.find('[data-testid="open-klasse-delete-dialog-icon"]').trigger('click');
    const deleteButton: Element = document.querySelector('[data-testid="klasse-delete-button"]')!;
    expect(deleteButton).toBeTruthy();
    deleteButton.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(organisationStore.deleteOrganisationById).toHaveBeenCalledWith(organisationStore.allKlassen[0]!.id);
  });
});
