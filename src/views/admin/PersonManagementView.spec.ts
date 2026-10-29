import { RollenArt, RollenMerkmal, RollenSystemRechtEnum } from '@/api-client/generated/api';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import {
  RollenSystemRecht,
  useRolleStore,
  type RolleResponse,
  type RolleStore,
  type TranslatedRolleWithAttrs,
} from '@/stores/RolleStore';
import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import type { Person } from '@/stores/types/Person';
import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { OperationType } from '@/stores/types/bulkOperationTypes';
import { DOMWrapper, VueWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type MockInstance } from 'vitest';
import {
  defineComponent,
  h,
  nextTick,
  type Component,
  type ComputedRef,
  type DefineComponent,
  type Slot,
  type VNode,
} from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import PersonManagementView from './PersonManagementView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;

let organisationStore: OrganisationStore;
let personStore: PersonStore;
let personenkontextStore: PersonenkontextStore;
let rolleStore: RolleStore;
let searchFilterStore: SearchFilterStore;
let authStore: AuthStore;

vi.useFakeTimers();
enableAutoUnmount(afterEach);

function mountComponent(): VueWrapper<InstanceType<typeof PersonManagementView>> {
  return mount(PersonManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        PersonManagementView: PersonManagementView as Component,
      },
      plugins: [router],
    },
  });
}

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
  personStore = usePersonStore();
  personenkontextStore = usePersonenkontextStore();
  rolleStore = useRolleStore();
  searchFilterStore = useSearchFilterStore();
  authStore = useAuthStore();

  authStore.currentUser = DoFactory.getUserinfoResponse();

  authStore.hasPersonenBulkPermission = true;
  authStore.hasPersonenLoeschenPermission = true;
  authStore.hasPersonenverwaltungPermission = true;
  authStore.grantedGatedRollenSystemrechte = [];

  personStore.getAllPersons = vi.fn();
  organisationStore.getAllOrganisationen = vi.fn();
  rolleStore.getRollenForPersonAdministration = vi.fn();
  personenkontextStore.processWorkflowStep = vi.fn();

  personStore.allUebersichten = new Map();
  for (let index: number = 0; index < 5; index++) {
    const person: Person = DoFactory.getPerson();
    const zuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern });
    const personWithZuordnungen: PersonWithZuordnungen = DoFactory.getPersonWithZuordnung(person, [zuordnung]);
    personStore.allUebersichten.set(personWithZuordnungen.id, personWithZuordnungen);
  }

  personStore.totalPersons = personStore.allUebersichten.size;

  rolleStore.rollenForPersonAdministration = [
    DoFactory.getRolleResponse({
      id: '10',
      administeredBySchulstrukturknoten: '1',
      merkmale: [],
      name: 'Rolle 1',
      rollenart: RollenArt.Lern,
      systemrechte: [],
    }),
  ];

  personenkontextStore.workflowStepResponse = {
    organisations: [
      {
        id: '9876',
        administriertVon: 'string',
        kennung: 'string',
        name: 'orga',
        namensergaenzung: 'string',
        kuerzel: 'string',
        typ: 'ROOT',
      },
      {
        id: '1134',
        administriertVon: 'string',
        kennung: 'string',
        name: 'orga1',
        namensergaenzung: 'string',
        kuerzel: 'string',
        typ: 'ROOT',
      },
    ],
    selectedOrganisation: null,
    selectedRollen: null,
    canCommit: true,
  };

  organisationStore.klassenFilters.set('personen-management', {
    total: 42,
    filterResult: [],
    loading: false,
  });

  searchFilterStore.$reset();

  wrapper = mountComponent();
});

describe('PersonManagementView', () => {
  test('it renders person management table', () => {
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="person-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(personStore.allUebersichten.size);
  });

  test('it renders person management table with active orga filter', () => {
    searchFilterStore.selectedOrganisationen = [DoFactory.getSchule({ id: '9876' })];
    searchFilterStore.selectedRollen = null;
    searchFilterStore.selectedKlassen = null;
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="person-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(personStore.allUebersichten.size);
  });

  test('it renders person management table with active rolle filter', () => {
    searchFilterStore.selectedOrganisationen = null;
    searchFilterStore.selectedRollen = [DoFactory.getRolleResponse({ id: '10' })];
    searchFilterStore.selectedKlassen = null;
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="person-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(personStore.allUebersichten.size);
  });

  test('it navigates to details view', async () => {
    const spy: MockInstance = vi.spyOn(router, 'push');
    const person: Person = DoFactory.getPerson();
    const zuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern });
    const personWithZuordnungen: PersonWithZuordnungen = DoFactory.getPersonWithZuordnung(person, [zuordnung]);
    personStore.allUebersichten.clear();
    personStore.allUebersichten.set(personWithZuordnungen.id, personWithZuordnungen);
    await flushPromises();

    const row: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-table"] .v-data-table__tr');
    await row?.trigger('click');
    const personRow: Record<string, string | null> = {
      id: personWithZuordnungen.id,
      familienname: personWithZuordnungen.name.familienname,
      vorname: personWithZuordnungen.name.vorname,
      username: personWithZuordnungen.username,
      personalnummer: personWithZuordnungen.personalnummer,
      rollen: personWithZuordnungen.rollenAsString,
      administrationsebenen: personWithZuordnungen.administrationsebenenAsString,
      klassen: personWithZuordnungen.klassenZuordnungenAsString,
    };
    const resultTable: VueWrapper = wrapper?.getComponent({ name: 'ResultTable' }) as VueWrapper;
    resultTable.vm.$emit('onHandleRowClick', undefined, { item: personRow });
    await nextTick();

    expect(spy).toHaveBeenCalledWith({
      name: 'person-details',
      params: {
        id: personWithZuordnungen.id,
      },
    });
  });

  test('selection is mirrored in the store', async () => {
    const orgId: Array<string> = ['9876'];
    const organisations: Organisation[] = [DoFactory.getSchule({ id: orgId[0] })];
    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });
    await organisationAutocomplete?.setValue(organisations);
    organisationAutocomplete?.vm.$emit('update:selectedSchulen', organisations);
    await flushPromises();
    expect(searchFilterStore.setOrganisationFilterForPersonen).toHaveBeenCalledWith(organisations);
  });

  test('it calls getAllPersons with correct arguments', async () => {
    const getAllPersonsSpy: MockInstance = vi.spyOn(personStore, 'getAllPersons');
    searchFilterStore.selectedOrganisationen = [DoFactory.getSchule({ id: '9876' })];

    const klasse: Organisation = DoFactory.getKlasse();
    searchFilterStore.selectedKlassen = [klasse];
    const klasseFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });
    const klasseAutocomplete: VueWrapper | undefined = klasseFilter?.findComponent({ name: 'v-autocomplete' });
    await klasseAutocomplete?.setValue([klasse]);
    klasseFilter?.vm.$emit('update:selectedKlassen', [klasse]);
    await flushPromises();
    expect(searchFilterStore.setKlasseFilterForPersonen).toHaveBeenCalledWith([klasse]);
    expect(searchFilterStore.selectedKlassen).toEqual([klasse]);

    // Check if getAllPersons was called with the correct arguments
    expect(getAllPersonsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationIDs: [klasse.id], // This should be the selectedKlassen value
      }),
    );

    searchFilterStore.selectedKlassen = [];
    // Clear selectedKlassen and test again
    await klasseAutocomplete?.setValue([]);
    klasseAutocomplete?.vm.$emit('update:selectedKlassen', []);
    await flushPromises();

    expect(searchFilterStore.selectedKlassen).toEqual([]);

    // Now it should use selectedSchulen
    expect(getAllPersonsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationIDs: ['9876'], // This should be the selectedSchulen value
      }),
    );
  });

  test('it reloads data after changing page', async () => {
    // Mock the getAllPersons method to capture its arguments
    const getAllPersonsSpy: MockInstance = vi.spyOn(personStore, 'getAllPersons');

    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain(`1-${personStore.allUebersichten.size}`);

    personStore.totalPersons = 50;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('31-50');

    expect(getAllPersonsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: 30,
      }),
    );
  });

  test('it reloads data after changing limit', async () => {
    expect(wrapper?.find('.v-data-table-footer__items-per-page').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');

    const component: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await component?.setValue(50);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('50');

    /* set a limit lower than total persons */
    personStore.totalPersons = 100;
    await component?.setValue(30);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');
  });

  test('it fetches once with current filters and sorting after changing limit', async () => {
    await flushPromises();
    const schule: Organisation = DoFactory.getSchule({ id: 'schule-id' });
    const klasse: Organisation = DoFactory.getKlasse(schule, { id: 'klasse-id' });
    const rolle: RolleResponse = DoFactory.getRolleResponse({ id: 'rolle-id' });
    searchFilterStore.personenPage = 1;
    searchFilterStore.personenPerPage = 30;
    searchFilterStore.selectedOrganisationen = [schule];
    searchFilterStore.selectedKlassen = [klasse];
    searchFilterStore.selectedRollen = [rolle];
    searchFilterStore.searchStringForPersonen = 'current search';
    searchFilterStore.personenSortField = 'vorname';
    searchFilterStore.personenSortOrder = 'desc';
    searchFilterStore.currentSort = { key: 'vorname', order: 'desc' };
    personStore.totalPersons = 100;

    const getAllPersonsSpy: MockInstance = vi.mocked(personStore.getAllPersons);
    getAllPersonsSpy.mockClear();
    const component: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await component?.setValue(50);
    await flushPromises();

    expect(getAllPersonsSpy).toHaveBeenCalledTimes(1);
    expect(getAllPersonsSpy).toHaveBeenCalledWith({
      offset: 0,
      limit: 50,
      organisationIDs: [klasse.id],
      rolleIDs: [rolle.id],
      searchFilter: 'current search',
      sortField: 'vorname',
      sortOrder: 'desc',
    });
  });

  test('it keeps the autoselected Schule when resetting filters', async () => {
    const schule: Organisation = DoFactory.getSchule();
    authStore.currentUser = {
      ...DoFactory.getUserinfoResponse(),
      personenkontexte: [
        {
          organisation: schule,
          rolle: {
            systemrechte: [RollenSystemRecht.PersonenVerwalten],
            serviceProviderIds: [],
          },
        },
      ],
    };
    searchFilterStore.selectedOrganisationen = [schule];
    wrapper!.unmount();
    wrapper = mountComponent();
    await flushPromises();

    vi.mocked(personStore.getAllPersons).mockClear();
    await wrapper.get('[data-testid="reset-filter-button"]').trigger('click');
    await flushPromises();

    expect(searchFilterStore.selectedOrganisationen).toEqual([schule]);
    expect(personStore.getAllPersons).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organisationIDs: [schule.id],
      }),
    );
  });

  test('it sets and resets filters', async () => {
    const schule: Organisation = DoFactory.getSchule();
    organisationStore.organisationenFilters.set('person-management', {
      filterResult: [schule],
      total: 1,
      loading: false,
    });
    const klasse: Organisation = DoFactory.getKlasse(schule, {});
    organisationStore.klassenFilters.set('', {
      filterResult: [klasse],
      total: 1,
      loading: false,
    });

    const schuleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });
    const schuleInputElement: DOMWrapper<Element> | undefined = schuleAutocomplete?.find(
      '#person-management-organisation-select',
    );

    await schuleInputElement?.setValue([schule.name]);
    await nextTick();
    await flushPromises();

    expect((schuleInputElement?.element as HTMLInputElement).value).toBe(schule.name);

    const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    const rolle: RolleResponse = DoFactory.getRolleResponse();
    await rolleAutocomplete?.setValue([rolle]);
    await nextTick();

    expect(rolleAutocomplete?.text()).toEqual(rolle.name);

    const klasseAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-select' });
    const klassenInputElement: DOMWrapper<Element> | undefined = klasseAutocomplete?.find(
      '#personen-management-klasse-select',
    );

    await klassenInputElement?.setValue([klasse.name]);
    await nextTick();
    await flushPromises();

    expect((klassenInputElement?.element as HTMLInputElement).value).toBe(klasse.name);

    wrapper?.find('[data-testid="reset-filter-button"]').trigger('click');
    await nextTick();

    expect(schuleAutocomplete?.text()).toBe('');
    expect(rolleAutocomplete?.text()).toBe('');
    expect(klasseAutocomplete?.text()).toBe('');
  });

  it('should return the total value from klassenFilters if present', () => {
    interface PersonManagementView extends DefineComponent {
      totalKlassen: ComputedRef<number>;
    }
    const vm: PersonManagementView = wrapper?.vm as unknown as PersonManagementView;
    const totalKlassen: ComputedRef<number> = vm.totalKlassen;

    expect(totalKlassen).toBe(42);
  });

  it('should return 0 if klassenFilters does not contain the key', async () => {
    interface PersonManagementView extends DefineComponent {
      totalKlassen: ComputedRef<number>;
    }

    // The key 'personen-management-klassen-filter' is not set in klassenFilters
    organisationStore.klassenFilters.delete('personen-management');

    await nextTick();
    await flushPromises();

    const vm: PersonManagementView = wrapper?.vm as unknown as PersonManagementView;
    const totalKlassen: ComputedRef<number> = vm.totalKlassen;

    expect(totalKlassen).toBe(0);
  });

  test('it sorts Personen correctly when changing sort order', async () => {
    // Find the table header for "Nachname" (last name)
    const nachnameHeader: DOMWrapper<Element> | undefined = wrapper
      ?.findAll('.v-data-table__th')
      .find((th: DOMWrapper<Element>) => th.text().includes('Nachname'));

    // Click to sort descending
    await nachnameHeader?.trigger('click');
    await flushPromises();
    await nextTick();

    expect(personStore.getAllPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'familienname',
        sortOrder: 'desc',
      }),
    );

    // Click again to sort ascending
    await nachnameHeader?.trigger('click');
    await flushPromises();

    expect(personStore.getAllPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'familienname',
        sortOrder: 'asc',
      }),
    );

    // Find the table header for "Nachname" (last name)
    const vornameHeader: DOMWrapper<Element> | undefined = wrapper
      ?.findAll('.v-data-table__th')
      .find((th: DOMWrapper<Element>) => th.text().includes('Vorname'));

    // Click to sort asc
    await vornameHeader?.trigger('click');
    await flushPromises();
    await nextTick();

    expect(personStore.getAllPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'vorname',
        sortOrder: 'asc',
      }),
    );

    // Click again to sort desc
    await vornameHeader?.trigger('click');
    await flushPromises();
    await nextTick();
    expect(personStore.getAllPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'vorname',
        sortOrder: 'desc',
      }),
    );
  });

  test('it resets all sorting state and keeps the reset order on pagination', async () => {
    const vornameHeader: DOMWrapper<Element> | undefined = wrapper
      ?.findAll('.v-data-table__th')
      .find((th: DOMWrapper<Element>) => th.text().includes('Vorname'));
    await vornameHeader?.trigger('click');
    await flushPromises();

    expect(searchFilterStore.personenSortField).toBe('vorname');
    expect(searchFilterStore.personenSortOrder).toBe('asc');

    searchFilterStore.searchStringForPersonen = 'search';
    personStore.totalPersons = 50;
    await nextTick();

    vi.mocked(personStore.getAllPersons).mockClear();
    await wrapper!.get('[data-testid="reset-filter-button"]').trigger('click');
    await flushPromises();

    expect(searchFilterStore.personenSortField).toBe('familienname');
    expect(searchFilterStore.personenSortOrder).toBe('asc');
    expect(searchFilterStore.currentSort).toEqual({ key: 'familienname', order: 'asc' });
    expect(wrapper!.findComponent({ name: 'ResultTable' }).props('currentSort')).toEqual({
      key: 'familienname',
      order: 'asc',
    });

    interface PersonManagementView extends DefineComponent {
      sortField: string | null;
      sortOrder: 'asc' | 'desc' | null;
    }
    const vm: PersonManagementView = wrapper!.vm as unknown as PersonManagementView;
    expect(vm.sortField).toBe('familienname');
    expect(vm.sortOrder).toBe('asc');

    await wrapper!.get('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    await flushPromises();

    expect(personStore.getAllPersons).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: 30,
        sortField: 'familienname',
        sortOrder: 'asc',
      }),
    );
  });

  test('it updates Rollen search correctly', async () => {
    await flushPromises();
    const rollenAutocomplete: VueWrapper = wrapper!.findComponent({
      ref: 'rolle-select',
    });
    const getRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getRollenForPersonAdministration');
    getRollenSpy.mockClear();
    rollenAutocomplete.vm.$emit('update:search', 'name');
    await nextTick();
    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getRollenSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(getRollenSpy).toHaveBeenCalledOnce();
    expect(getRollenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        searchStr: 'name',
        limit: 25,
        organisationIds: [],
      }),
    );
  });

  test('it persists selected Rollen objects across searches and restores them after remounting', async () => {
    await flushPromises();
    const selectedRolle: RolleResponse = DoFactory.getRolleResponse({ name: 'Alpha' });
    const searchedRolle: RolleResponse = DoFactory.getRolleResponse({ name: 'Zebra' });
    vi.mocked(searchFilterStore.setRolleFilterForPersonen).mockImplementation(
      (rollen: RolleResponse[] | null): void => {
        searchFilterStore.selectedRollen = rollen;
      },
    );
    const rollenAutocomplete: VueWrapper = wrapper!.findComponent({
      ref: 'rolle-select',
    });
    expect(rollenAutocomplete.props()).toMatchObject({ returnObject: true });
    await rollenAutocomplete.setValue([selectedRolle]);

    expect(searchFilterStore.selectedRollen).toEqual([selectedRolle]);
    expect(personStore.getAllPersons).toHaveBeenLastCalledWith(
      expect.objectContaining({ rolleIDs: [selectedRolle.id] }),
    );

    rolleStore.rollenForPersonAdministration = [searchedRolle];
    await nextTick();
    await rollenAutocomplete.setValue([selectedRolle, searchedRolle]);
    await rollenAutocomplete.setValue([selectedRolle]);

    expect(searchFilterStore.selectedRollen).toEqual([selectedRolle]);
    expect(rollenAutocomplete.props()).toMatchObject({ items: [selectedRolle, searchedRolle] });
    expect(rolleStore.rollenForPersonAdministration).toEqual([searchedRolle]);

    wrapper!.unmount();
    wrapper = mountComponent();
    await flushPromises();
    const restoredAutocomplete: VueWrapper = wrapper.findComponent({
      ref: 'rolle-select',
    });
    expect(restoredAutocomplete.props()).toMatchObject({ modelValue: [selectedRolle] });
    expect(restoredAutocomplete.text()).toContain(selectedRolle.name);

    await wrapper.get('[data-testid="reset-filter-button"]').trigger('click');
    await flushPromises();
    expect(searchFilterStore.selectedRollen).toEqual([]);
    expect(restoredAutocomplete.props()).toMatchObject({ modelValue: [], items: [searchedRolle] });
    vi.mocked(searchFilterStore.setRolleFilterForPersonen).mockReset();
  });

  test('it restores selected organisation objects after navigation without resolving IDs', async () => {
    const selected: Organisation = DoFactory.getSchule();
    searchFilterStore.selectedOrganisationen = [selected];
    wrapper!.unmount();
    wrapper = mountComponent();
    await flushPromises();

    const filter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    const autocomplete: VueWrapper = filter.findComponent({ name: 'v-autocomplete' });
    expect(autocomplete.props()).toHaveProperty('modelValue', [selected]);
    expect(autocomplete.text()).toContain(selected.name);
    expect(personStore.getAllPersons).toHaveBeenLastCalledWith(
      expect.objectContaining({ organisationIDs: [selected.id] }),
    );
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
    expect(organisationStore.loadOrganisationForSelection).not.toHaveBeenCalled();
  });

  test('it clears the Rollen search on blur', async () => {
    await flushPromises();
    const rollenAutocomplete: VueWrapper = wrapper!.findComponent({
      ref: 'rolle-select',
    });
    rollenAutocomplete.vm.$emit('update:search', 'Lehrer');
    await nextTick();
    vi.advanceTimersByTime(500);
    await flushPromises();

    rollenAutocomplete.vm.$emit('update:focused', false);
    await nextTick();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(rollenAutocomplete.props()).toMatchObject({ search: '' });
    expect(rolleStore.getRollenForPersonAdministration).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchStr: '' }),
    );
  });

  test('it updates the Rollen organisation and MPT permission filters', async () => {
    await flushPromises();
    const schule: Organisation = DoFactory.getSchule();
    const schulenFilter: VueWrapper = wrapper!.findComponent({ name: 'SchulenFilter' });
    schulenFilter.vm.$emit('update:selectedSchulen', [schule]);
    await flushPromises();

    expect(rolleStore.getRollenForPersonAdministration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organisationIds: [schule.id],
        systemrechte: [RollenSystemRecht.PersonenVerwalten],
      }),
    );

    authStore.grantedGatedRollenSystemrechte = [RollenSystemRecht.MptRollenZuordnen];
    await flushPromises();

    expect(rolleStore.getRollenForPersonAdministration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organisationIds: [schule.id],
        systemrechte: [RollenSystemRecht.PersonenVerwalten, RollenSystemRecht.MptRollenZuordnen],
      }),
    );
  });

  test.each([
    { systemrechte: [] },
    {
      systemrechte: [
        RollenSystemRechtEnum.MptRollenZuordnen,
        RollenSystemRechtEnum.Pilot2RollenZuordnen,
        RollenSystemRechtEnum.Pilot5RollenZuordnen,
      ],
    },
  ])(
    'forwards granted gated rights to Rollen search: $systemrechte',
    async ({ systemrechte }: { systemrechte: RollenSystemRechtEnum[] }) => {
      authStore.grantedGatedRollenSystemrechte = systemrechte;
      const getRollenForPersonAdministration: MockInstance = vi
        .spyOn(rolleStore, 'getRollenForPersonAdministration')
        .mockResolvedValue(undefined);
      const rollenAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });

      rollenAutocomplete?.vm.$emit('update:search', 'pilot');
      await nextTick();
      vi.runAllTimers();
      await flushPromises();

      expect(getRollenForPersonAdministration).toHaveBeenLastCalledWith({
        searchStr: 'pilot',
        limit: 25,
        organisationIds: [],
        systemrechte: [RollenSystemRechtEnum.PersonenVerwalten, ...systemrechte],
      });
    },
  );

  type BulkOperationTestParams = {
    operationType: OperationType;
    layoutCardTestId: string;
    discardButtonTestId: string;
  };

  test.each([
    {
      operationType: OperationType.CHANGE_KLASSE,
      layoutCardTestId: 'change-klasse-layout-card',
      discardButtonTestId: 'bulk-change-klasse-discard-button',
    },
    {
      operationType: OperationType.DELETE_PERSON,
      layoutCardTestId: 'person-delete-layout-card',
      discardButtonTestId: 'person-delete-discard-button',
    },
    {
      operationType: OperationType.MODIFY_ROLLE,
      layoutCardTestId: 'rolle-modify-layout-card',
      discardButtonTestId: 'rolle-modify-discard-button',
    },
    {
      operationType: OperationType.ORG_UNASSIGN,
      layoutCardTestId: 'org-unassign-layout-card',
      discardButtonTestId: 'org-unassign-discard-button',
    },
    {
      operationType: OperationType.RESET_PASSWORD,
      layoutCardTestId: 'password-reset-layout-card',
      discardButtonTestId: 'password-reset-discard-button',
    },
    {
      operationType: OperationType.ROLLE_UNASSIGN,
      layoutCardTestId: 'rolle-unassign-layout-card',
      discardButtonTestId: 'rolle-unassign-discard-button',
    },
  ])(
    'it checks a checkbox in the table, selects $operationType, triggers dialog then cancels it',
    async ({ operationType, layoutCardTestId, discardButtonTestId }: BulkOperationTestParams) => {
      const schuleAutocomplete: VueWrapper | undefined = wrapper
        ?.findComponent({ ref: 'schulenFilter' })
        .findComponent({ ref: 'person-management-organisation-select' });
      await schuleAutocomplete?.setValue([DoFactory.getSchule({ id: '9876' })]);
      await flushPromises();

      // Find the first checkbox in the table
      const checkbox: DOMWrapper<Element> | undefined = wrapper?.find(
        '[data-testid="person-table"] .v-selection-control',
      );
      // Initial state check (optional)
      expect(checkbox?.classes()).not.toContain('v-selection-control--selected');
      // Trigger the checkbox click
      await checkbox?.trigger('click');
      await nextTick();

      const benutzerEditSelect: VueWrapper | undefined = wrapper?.findComponent({ ref: 'benutzer-bulk-edit-select' });
      benutzerEditSelect?.setValue(operationType);
      await nextTick();

      expect(document.body.querySelector(`[data-testid="${layoutCardTestId}"]`)).not.toBeNull();

      const cancelButton: Element | null = document.querySelector(`[data-testid="${discardButtonTestId}"]`);
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      expect(document.body.querySelector(`[data-testid="${layoutCardTestId}"]`)).toBeNull();
    },
  );

  test('offers Pilot-Merkmal rollen (not just MPT) in the Rolle zuordnen bulk dialog', async () => {
    const pilotRolle: TranslatedRolleWithAttrs = {
      value: '99999',
      title: 'Pilot Rolle',
      rollenart: RollenArt.Schb,
      merkmale: [RollenMerkmal.Pilot2Rolle],
    };
    rolleStore.rollenForPersonenkontextCreation = [...rolleStore.rollenForPersonenkontextCreation, pilotRolle];

    const checkbox: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="person-table"] .v-selection-control',
    );
    await checkbox?.trigger('click');
    await nextTick();

    const benutzerEditSelect: VueWrapper | undefined = wrapper?.findComponent({ ref: 'benutzer-bulk-edit-select' });
    benutzerEditSelect?.setValue(OperationType.MODIFY_ROLLE);
    await nextTick();

    const rolleSelect: VueWrapper = wrapper?.findComponent(
      '[data-testid="rolle-modify-layout-card"] [data-testid="rolle-select"]',
    ) as VueWrapper;
    const rollenItems: Array<{ value: string }> = (
      rolleSelect as unknown as { props: (key: string) => Array<{ value: string }> }
    ).props('items');
    expect(rollenItems.some((item: { value: string }) => item.value === '99999')).toBe(true);
  });

  test.each([
    [OperationType.CHANGE_KLASSE],
    [OperationType.DELETE_PERSON],
    // [OperationType.MODIFY_ROLLE],
    [OperationType.ORG_UNASSIGN],
    [OperationType.RESET_PASSWORD],
    [OperationType.ROLLE_UNASSIGN],
  ])('%s is not shown if user has no permission', async (operationType: OperationType) => {
    authStore.hasPersonenLoeschenPermission = false;
    authStore.hasPersonenverwaltungPermission = false;

    wrapper = mountComponent();

    // Find the first checkbox in the table
    const checkbox: DOMWrapper<Element> | undefined = wrapper.find('[data-testid="person-table"] .v-selection-control');
    // Initial state check (optional)
    expect(checkbox.classes()).not.toContain('v-selection-control--selected');

    // Trigger the checkbox click
    await checkbox.trigger('click');
    await nextTick();

    const benutzerEditSelect: VueWrapper | undefined = wrapper.findComponent({ ref: 'benutzer-bulk-edit-select' });

    (benutzerEditSelect.props() as { items: { value: string }[] })['items'].forEach((item: { value: string }) => {
      expect(item.value).not.toBe(operationType);
    });
  });

  test('it shows loading spinner in schule filter dropdown', async () => {
    organisationStore.organisationenFilters.set('person-management', {
      filterResult: [],
      total: 0,
      loading: true,
    });
    await nextTick();

    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });

    // Den Slot-Inhalt direkt aus SchulenFilter rendern
    const prependItemSlot: Slot | undefined = schulenFilter?.getCurrentComponent()?.slots?.['prepend-item'];
    expect(prependItemSlot).toBeDefined();

    // Slot aufrufen und rendern
    const slotVNodes: VNode[] | undefined = prependItemSlot?.();
    const slotWrapper: VueWrapper | undefined = mount(
      defineComponent({
        render() {
          return h('div', slotVNodes);
        },
      }),
    );

    expect(slotWrapper.findComponent({ name: 'v-progress-circular' }).exists()).toBe(true);
  });

  test('it shows schule count in schule filter dropdown when not loading', async () => {
    organisationStore.organisationenFilters.set('person-management', {
      filterResult: [],
      total: 5,
      loading: false,
    });
    await nextTick();

    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });
    const prependItemSlot: Slot | undefined = schulenFilter?.getCurrentComponent()?.slots?.['prepend-item'];
    expect(prependItemSlot).toBeDefined();

    const slotVNodes: VNode[] | undefined = prependItemSlot?.();
    const slotWrapper: VueWrapper | undefined = mount(
      defineComponent({
        render() {
          return h('div', slotVNodes);
        },
      }),
    );

    expect(slotWrapper.findComponent({ name: 'v-progress-circular' }).exists()).toBe(false);
    expect(slotWrapper.find('.filter-header').exists()).toBe(true);
    expect(slotWrapper.find('.filter-header').text()).toContain('5');
  });

  test('it shows the error dialog, when the selection is invalid', async () => {
    wrapper = mountComponent();
    // don't select schule and select a person without LERN-rolle
    personStore.allUebersichten = new Map();
    const person: Person = DoFactory.getPerson();
    const zuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Leit });
    personStore.allUebersichten.set(person.id, DoFactory.getPersonWithZuordnung(person, [zuordnung]));

    await flushPromises();

    const schuleAutocomplete: VueWrapper | undefined = wrapper
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'person-management-organisation-select' });
    await schuleAutocomplete.setValue([]);
    await nextTick();

    const checkbox: DOMWrapper<Element> | undefined = wrapper.find('[data-testid="person-table"] .v-selection-control');
    // Initial state check (optional)
    expect(checkbox.classes()).not.toContain('v-selection-control--selected');
    // Trigger the checkbox click
    await checkbox.trigger('click');
    await nextTick();
    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    resultTable.vm.$emit('update:selectedRows', [person.id]);
    await nextTick();

    const benutzerEditSelect: VueWrapper | undefined = wrapper.findComponent({ ref: 'benutzer-bulk-edit-select' });
    benutzerEditSelect.setValue(OperationType.CHANGE_KLASSE);
    await nextTick();

    expect(document.body.querySelector(`[data-testid="invalid-selection-alert-dialog-layout-card"]`)).not.toBeNull();
    expect(
      document.body.querySelector(`[data-testid="invalid-selection-alert-dialog-layout-card"]`)?.textContent,
    ).toContain('genau eine Schule');
    expect(
      document.body.querySelector(`[data-testid="invalid-selection-alert-dialog-layout-card"]`)?.textContent,
    ).toContain('Schülerrolle');
  });
});
