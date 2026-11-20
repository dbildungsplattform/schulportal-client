import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { useOrganisationsbeziehungStore, type OrganisationsbeziehungStore } from '@/stores/OrganisationsbeziehungStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { OrganisationsbeziehungsTyp, SortFieldOrganisationsbeziehung } from '@/api-client/generated/api';
import OrganisationRelationshipSelector from './OrganisationRelationshipSelector.vue';
import OrganisationsbeziehungenSection from './OrganisationsbeziehungenSection.vue';

enableAutoUnmount(afterEach);

type TestState = {
  wrapper: VueWrapper;
  store: OrganisationsbeziehungStore;
  organisationStore: OrganisationStore;
  organisation: Organisation;
  openSection: () => Promise<void>;
  table: () => VueWrapper;
};

function setup(showDienststellennummerColumn: boolean = true): TestState {
  document.body.innerHTML = '<div id="app"></div>';
  const store: OrganisationsbeziehungStore = useOrganisationsbeziehungStore();
  store.$reset();
  store.total = 90;
  store.loadBeziehungen = vi.fn().mockResolvedValue(undefined);
  const organisationStore: OrganisationStore = useOrganisationStore();
  organisationStore.$reset();
  const organisation: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Schule });
  organisationStore.currentSchule = organisation;
  organisationStore.searchOrganisationsForRelationships = vi.fn().mockResolvedValue(undefined);
  organisationStore.createOrganisationRelationship = vi.fn().mockResolvedValue(undefined);
  const mountedWrapper: unknown = mount(OrganisationsbeziehungenSection, {
    attachTo: document.getElementById('app') || '',
    props: {
      headline: 'Zugeordnete Beziehungen anzeigen',
      organisationId: organisation.id,
      showDienststellennummerColumn,
    },
  });
  const wrapper: VueWrapper = mountedWrapper as VueWrapper;
  async function openSection(): Promise<void> {
    await wrapper.get('[data-testid="organisationsbeziehungen-toggle-button"]').trigger('click');
    await flushPromises();
  }
  function table(): VueWrapper {
    const resultTable: unknown = wrapper.findComponent({ name: 'ResultTable' });
    return resultTable as VueWrapper;
  }
  return { wrapper, store, organisationStore, organisation, openSection, table };
}

function emit(wrapper: VueWrapper, componentName: string, event: string, ...args: unknown[]): void {
  const instance: unknown = wrapper.findComponent({ name: componentName }).vm;
  if (typeof instance !== 'object' || instance === null || !('$emit' in instance)) {
    throw new Error(`The ${componentName} component does not expose Vue events.`);
  }
  const emitter: { $emit: (event: string, ...args: unknown[]) => void } = instance as {
    $emit: (event: string, ...args: unknown[]) => void;
  };
  emitter.$emit(event, ...args);
}

describe('OrganisationsbeziehungenSection', (): void => {
  it('should render its headline without loading while collapsed and load when expanded', async (): Promise<void> => {
    const { wrapper, store, organisation, openSection }: TestState = setup();
    expect(wrapper.get('[data-testid="organisationsbeziehungen-headline"]').text()).toBe(
      'Zugeordnete Beziehungen anzeigen',
    );
    expect(store.loadBeziehungen).not.toHaveBeenCalled();

    await openSection();

    expect(wrapper.get('[data-testid="organisationsbeziehungen-toggle-button"]').attributes('aria-expanded')).toBe(
      'true',
    );
    expect(store.loadBeziehungen).toHaveBeenCalledExactlyOnceWith(organisation.id, {
      offset: 0,
      limit: 30,
      searchString: '',
      sortField: 'typ',
      sortOrder: 'asc',
    });
    await openSection();
    expect(wrapper.get('[data-testid="organisationsbeziehungen-toggle-button"]').attributes('aria-expanded')).toBe(
      'false',
    );
    expect(store.loadBeziehungen).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    'should render the other organisation when the context is the source: %s',
    async (asQuelle: boolean): Promise<void> => {
      const { wrapper, store, organisation, openSection }: TestState = setup();
      const related: Organisation = DoFactory.getSchule();
      store.beziehungen = [
        DoFactory.getOrganisationsbeziehung({
          typ: OrganisationsbeziehungsTyp.Schulaufsicht,
          quelle: asQuelle
            ? { id: organisation.id, name: organisation.name }
            : { id: related.id, name: related.name, dienststellennummer: related.kennung },
          ziel: asQuelle
            ? { id: related.id, name: related.name, dienststellennummer: related.kennung }
            : { id: organisation.id, name: organisation.name },
        }),
        DoFactory.getOrganisationsbeziehung(),
      ];

      await openSection();

      const text: string = wrapper.get('[data-testid="organisationsbeziehungen-table"]').text();
      expect(text).toContain(related.name);
      expect(text).toContain(related.kennung);
      expect(text).toContain('Schulaufsicht');
      expect(text).not.toContain(organisation.name);
      expect(wrapper.findComponent({ name: 'ResultTable' }).props('items')).toHaveLength(1);
    },
  );

  it('should render a missing Kennung fallback', async (): Promise<void> => {
    const { wrapper, store, organisation, openSection }: TestState = setup();
    const related: Organisation = DoFactory.getOrganisation();
    store.beziehungen = [
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: organisation.id, name: organisation.name },
        ziel: { id: related.id, name: related.name, dienststellennummer: null },
      }),
    ];

    await openSection();

    expect(wrapper.get('[data-testid="organisationsbeziehungen-table"]').text()).toContain('---');
  });

  it.each([true, false])(
    'should show the Kennung column only when enabled: %s',
    async (show: boolean): Promise<void> => {
      const { wrapper, openSection }: TestState = setup(show);
      await openSection();
      expect(wrapper.get('[data-testid="organisationsbeziehungen-table"]').text().includes('Dienststellennummer')).toBe(
        show,
      );
    },
  );

  it('should load the requested page and reset pagination when the page size changes', async (): Promise<void> => {
    const { wrapper, store, organisation, openSection, table }: TestState = setup();
    await openSection();
    emit(wrapper, 'ResultTable', 'onPageUpdate', 3);
    await flushPromises();
    expect(store.loadBeziehungen).toHaveBeenLastCalledWith(
      organisation.id,
      expect.objectContaining({ offset: 60, limit: 30 }),
    );
    emit(wrapper, 'ResultTable', 'onItemsPerPageUpdate', 10);
    await flushPromises();
    expect(store.loadBeziehungen).toHaveBeenLastCalledWith(
      organisation.id,
      expect.objectContaining({ offset: 0, limit: 10 }),
    );
    expect(table().exists()).toBe(true);
  });

  it('should apply changed search filters from page one and ignore unchanged filters', async (): Promise<void> => {
    const { wrapper, store, organisation, openSection }: TestState = setup();
    await openSection();
    emit(wrapper, 'ResultTable', 'onPageUpdate', 2);
    await flushPromises();
    emit(wrapper, 'OrganisationsbeziehungenFilter', 'onApplySearchFilter', 'Schule');
    await flushPromises();
    expect(store.loadBeziehungen).toHaveBeenLastCalledWith(
      organisation.id,
      expect.objectContaining({ offset: 0, searchString: 'Schule' }),
    );
    vi.mocked(store.loadBeziehungen).mockClear();
    emit(wrapper, 'OrganisationsbeziehungenFilter', 'onApplySearchFilter', 'Schule');
    await flushPromises();
    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });

  it('should apply sorting from page one and ignore updates without a sort field', async (): Promise<void> => {
    const { wrapper, store, organisation, openSection }: TestState = setup();
    await openSection();
    emit(wrapper, 'ResultTable', 'onPageUpdate', 2);
    await flushPromises();
    emit(wrapper, 'ResultTable', 'onTableUpdate', {
      sortField: SortFieldOrganisationsbeziehung.AndereOrganisationName,
      sortOrder: 'desc',
    });
    await flushPromises();
    expect(store.loadBeziehungen).toHaveBeenLastCalledWith(
      organisation.id,
      expect.objectContaining({ offset: 0, sortField: 'andereOrganisationName', sortOrder: 'desc' }),
    );
    vi.mocked(store.loadBeziehungen).mockClear();
    emit(wrapper, 'ResultTable', 'onTableUpdate', { sortField: undefined, sortOrder: 'asc' });
    await flushPromises();
    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });

  it('should keep assignment available when relationship loading fails', async (): Promise<void> => {
    const { wrapper, store, openSection }: TestState = setup();
    store.errorCode = 'UNSPECIFIED_ERROR';

    await openSection();

    expect(wrapper.find('[data-testid="organisationsbeziehungen-error-alert"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="organisationsbeziehungen-table"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="organisationsbeziehungen-add-button"]').isVisible()).toBe(true);
  });

  it('should replace the table inline and restore its expanded page without reloading on cancel', async (): Promise<void> => {
    const { wrapper, store, openSection }: TestState = setup();
    await openSection();
    emit(wrapper, 'ResultTable', 'onPageUpdate', 2);
    await flushPromises();

    await wrapper.get('[data-testid="organisationsbeziehungen-add-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.findComponent(OrganisationRelationshipSelector).exists()).toBe(true);
    expect(wrapper.find('[data-testid="organisationsbeziehungen-table"]').exists()).toBe(false);
    await wrapper.get('[data-testid="org-selector-cancel-button"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="organisationsbeziehungen-table"]').isVisible()).toBe(true);
    expect(wrapper.findComponent({ name: 'ResultTable' }).props()).toMatchObject({ currentPage: 2 });
    expect(store.loadBeziehungen).toHaveBeenCalledTimes(2);
  });

  it('should refresh the existing table from page one after successful saves and retain filters', async (): Promise<void> => {
    const { wrapper, store, organisation, organisationStore, openSection }: TestState = setup();
    const selectedOrganisation: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    await openSection();
    emit(wrapper, 'OrganisationsbeziehungenFilter', 'onApplySearchFilter', 'Schule');
    await flushPromises();
    emit(wrapper, 'ResultTable', 'onPageUpdate', 2);
    await flushPromises();
    await wrapper.get('[data-testid="organisationsbeziehungen-add-button"]').trigger('click');
    await flushPromises();
    organisationStore.searchedOrganisations = [selectedOrganisation];
    await flushPromises();
    await wrapper.get(`[data-testid="org-selector-checkbox-${selectedOrganisation.id}"]`).trigger('click');
    await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="org-selector-finish-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="organisationsbeziehungen-table"]').isVisible()).toBe(true);
    expect(wrapper.findComponent({ name: 'ResultTable' }).props()).toMatchObject({ currentPage: 1 });
    expect(store.loadBeziehungen).toHaveBeenLastCalledWith(
      organisation.id,
      expect.objectContaining({ offset: 0, searchString: 'Schule' }),
    );
  });
});
