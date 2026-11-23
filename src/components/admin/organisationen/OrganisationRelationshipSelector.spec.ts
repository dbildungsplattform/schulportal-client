import { DOMWrapper, enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { VTreeview } from 'vuetify/components';
import { DoFactory } from 'test/DoFactory';
import SearchField from '@/components/admin/SearchField.vue';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import * as fileUtils from '@/utils/file';
import { getDisplayNameForOrg } from '@/utils/formatting';
import OrganisationRelationshipSelector from './OrganisationRelationshipSelector.vue';

enableAutoUnmount(afterEach);
afterEach((): void => {
  vi.restoreAllMocks();
});

type TestState = {
  store: OrganisationStore;
  schule: Organisation;
  behoerden: Organisation[];
  mountSelector: (organisationId?: string, showComponent?: boolean) => Promise<VueWrapper>;
};

function setup(): TestState {
  document.body.innerHTML = '<div id="app"></div>';
  const store: OrganisationStore = useOrganisationStore();
  store.$reset();
  const schule: Organisation = DoFactory.getSchule();
  const behoerden: Organisation[] = [0, 1, 2].map(
    (): Organisation => DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde }),
  );
  store.currentSchule = schule;
  store.searchedOrganisations = behoerden;
  store.searchOrganisationsForRelationships = vi.fn().mockResolvedValue(undefined);
  store.createOrganisationRelationships = vi.fn(
    (contextOrganisation: Organisation | undefined, selectedOrganisations: Organisation[]): Promise<void> => {
      store.relationshipBatch = {
        isRunning: false,
        isComplete: true,
        completed: selectedOrganisations.length,
        total: selectedOrganisations.length,
        progress: selectedOrganisations.length > 0 ? 100 : 0,
        failures: contextOrganisation
          ? []
          : selectedOrganisations.map(
              (organisation: Organisation): { organisation: Organisation; errorCode: string } => ({
                organisation,
                errorCode: 'CREATE_RELATIONSHIP_ERROR',
              }),
            ),
      };
      return Promise.resolve();
    },
  );
  async function mountSelector(organisationId: string = schule.id, showComponent: boolean = true): Promise<VueWrapper> {
    const mountedWrapper: unknown = mount(OrganisationRelationshipSelector, {
      attachTo: document.getElementById('app') || '',
      props: { organisationId, showComponent },
    });
    const wrapper: VueWrapper = mountedWrapper as VueWrapper;
    await flushPromises();
    return wrapper;
  }
  return { store, schule, behoerden, mountSelector };
}

async function select(wrapper: VueWrapper, organisations: Organisation[]): Promise<void> {
  wrapper.getComponent(VTreeview).vm.$emit(
    'update:modelValue',
    organisations.map((org: Organisation): string => org.id),
  );
  await flushPromises();
}

describe('OrganisationRelationshipSelector', (): void => {
  it('should initially search and disable saving before selection', async (): Promise<void> => {
    const { store, schule, mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();
    expect(store.searchOrganisationsForRelationships).toHaveBeenCalledExactlyOnceWith(schule.id, undefined);
    expect(wrapper.find('[data-testid="org-selector-treeview"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="org-selector-create-button"]').attributes('disabled')).toBeDefined();
  });

  it('should show the Behörde placeholder and name-only hint when searching from a school', async (): Promise<void> => {
    const { mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();
    expect(wrapper.get('[data-testid="search-filter-input"]').find('input').attributes('placeholder')).toBe('Behörde');
    expect(wrapper.getComponent(SearchField).props('hoverText')).toBe('Name');
  });

  it('should show the Schule placeholder and name/Kennung hint when searching from a Behörde', async (): Promise<void> => {
    const { store, schule, mountSelector }: TestState = setup();
    const behoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    store.currentSchule = null;
    store.currentOrganisation = behoerde;
    store.searchedOrganisations = [schule];
    const wrapper: VueWrapper = await mountSelector(behoerde.id);
    expect(wrapper.get('[data-testid="search-filter-input"]').find('input').attributes('placeholder')).toBe('Schule');
    expect(wrapper.getComponent(SearchField).props('hoverText')).toBe('Name oder Kennung');
  });

  it('should not search or render when hidden', async (): Promise<void> => {
    const { store, schule, mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector(schule.id, false);
    expect(store.searchOrganisationsForRelationships).not.toHaveBeenCalled();
    expect(wrapper.find('section').exists()).toBe(false);
  });

  it.each(['12345', 'Gymnasium'])(
    'should submit %s only on search and support Enter and clearing',
    async (searchString: string): Promise<void> => {
      const { store, schule, mountSelector }: TestState = setup();
      const wrapper: VueWrapper = await mountSelector();
      await wrapper.get('[data-testid="search-filter-input"] input').setValue(searchString);
      expect(store.searchOrganisationsForRelationships).toHaveBeenCalledTimes(1);
      await wrapper.get('[data-testid="apply-search-filter-button"]').trigger('click');
      await flushPromises();
      expect(store.searchOrganisationsForRelationships).toHaveBeenLastCalledWith(schule.id, searchString);
      await wrapper.get('[data-testid="search-filter-input"] input').setValue(' Another ');
      await wrapper.get('[data-testid="search-filter-input"] input').trigger('keyup.enter');
      await flushPromises();
      expect(store.searchOrganisationsForRelationships).toHaveBeenLastCalledWith(schule.id, 'Another');
      await wrapper.get('[data-testid="search-filter-input"] .v-field__clearable .v-icon').trigger('click');
      await flushPromises();
      expect(store.searchOrganisationsForRelationships).toHaveBeenLastCalledWith(schule.id, undefined);
    },
  );

  it('should select only the organisation whose checkbox was clicked', async (): Promise<void> => {
    const { behoerden, mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();

    await wrapper.get(`[data-testid="org-selector-checkbox-${behoerden[0]!.id}"] input`).trigger('click');

    expect(wrapper.getComponent(VTreeview).props('modelValue')).toEqual([behoerden[0]!.id]);
    expect(wrapper.findAll('[data-testid^="org-selector-checkbox-"] input:checked')).toHaveLength(1);
  });

  it('should keep newest selections first and retain them across searches', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    const first: Organisation = behoerden[0]!;
    const second: Organisation = behoerden[1]!;
    const wrapper: VueWrapper = await mountSelector();
    await wrapper.get(`[data-testid="org-selector-checkbox-${first.id}"] input`).trigger('click');
    await wrapper.get(`[data-testid="org-selector-checkbox-${second.id}"] input`).trigger('click');
    store.searchedOrganisations = [behoerden[2]!];
    await nextTick();
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toEqual([second.id, first.id]);
    expect(wrapper.getComponent(VTreeview).props('items')).toEqual([
      {
        id: 'select-all',
        title: 'Alle auswählen',
        children: [second, first, behoerden[2]!].map((org: Organisation): { id: string; title: string } => ({
          id: org.id,
          title: getDisplayNameForOrg(org),
        })),
      },
    ]);
    await wrapper.get(`[data-testid="org-selector-checkbox-${first.id}"] input`).trigger('click');
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toEqual([second.id]);
  });

  it('should handle select all, partial selection, deselection and invalid tree values', async (): Promise<void> => {
    const { behoerden, mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();
    await wrapper.get('[data-testid="org-selector-select-all"] input').trigger('click');
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toHaveLength(3);
    await wrapper.get(`[data-testid="org-selector-checkbox-${behoerden[0]!.id}"] input`).trigger('click');
    expect(wrapper.get('[data-testid="org-selector-select-all"] input').attributes('aria-checked')).toBe('mixed');
    wrapper.getComponent(VTreeview).vm.$emit('update:modelValue', null);
    await nextTick();
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toHaveLength(2);
    await wrapper.get('[data-testid="org-selector-select-all"] input').trigger('click');
    await wrapper.get('[data-testid="org-selector-select-all"] input').trigger('click');
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toEqual([]);
    await select(wrapper, []);
    expect(wrapper.get('[data-testid="org-selector-create-button"]').attributes('disabled')).toBeDefined();
  });

  it('should exclude Traeger from school selection and hide the entire tree for no results', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    const traeger: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger });
    store.searchedOrganisations = [behoerden[0]!, traeger];
    const wrapper: VueWrapper = await mountSelector();
    expect(wrapper.find(`[data-testid="org-selector-checkbox-${traeger.id}"]`).exists()).toBe(false);
    await wrapper.get('[data-testid="org-selector-select-all"] input').trigger('click');
    expect(wrapper.getComponent(VTreeview).props('modelValue')).toEqual([behoerden[0]!.id]);
    await wrapper.get('[data-testid="org-selector-select-all"] input').trigger('click');
    store.searchedOrganisations = [traeger];
    await nextTick();
    expect(wrapper.find('[data-testid="org-selector-treeview"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="org-selector-select-all"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="org-selector-empty"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="org-selector-empty"]').text()).toBe('Keine passenden Behörden gefunden.');
  });

  it('should show a school-specific empty state when a Behörde has no matching schools', async (): Promise<void> => {
    const { store, mountSelector }: TestState = setup();
    const behoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    store.currentSchule = null;
    store.currentOrganisation = behoerde;
    store.searchedOrganisations = [];
    const wrapper: VueWrapper = await mountSelector(behoerde.id);
    expect(wrapper.get('[data-testid="org-selector-empty"]').text()).toBe('Keine passenden Schulen gefunden.');
  });

  it('should show a centered circular spinner and disable saving during search', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();
    await select(wrapper, [behoerden[0]!]);
    store.relationshipSearchLoading = true;
    await nextTick();
    expect(wrapper.get('[data-testid="org-selector-search-loading"]').classes()).toContain('v-progress-circular');
    expect(wrapper.get('[data-testid="org-selector-search-loading"]').element.closest('.v-row')?.className).toContain(
      'justify-center',
    );
    expect(wrapper.get('[data-testid="org-selector-create-button"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="org-selector-select-all"] input').attributes('disabled')).toBeDefined();
  });

  it('should display and recover from search errors without hiding search', async (): Promise<void> => {
    const { store, mountSelector }: TestState = setup();
    store.searchOrganisationsForRelationships = vi
      .fn()
      .mockImplementationOnce((): Promise<void> => {
        store.relationshipErrorCode = 'SEARCH_ORGANISATIONS_ERROR';
        return Promise.resolve();
      })
      .mockImplementationOnce((): Promise<void> => {
        store.relationshipErrorCode = '';
        return Promise.resolve();
      });
    const wrapper: VueWrapper = await mountSelector();
    expect(wrapper.find('[data-testid="org-selector-error-alert"]').exists()).toBe(true);
    await wrapper.get('[data-testid="apply-search-filter-button"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="org-selector-error-alert"]').exists()).toBe(false);
  });

  it('should show store progress and count three successful saves', async (): Promise<void> => {
    const { store, schule, behoerden, mountSelector }: TestState = setup();
    let finishBatch: (() => void) | undefined;
    store.createOrganisationRelationships = vi.fn(
      (_contextOrganisation: Organisation | undefined, selectedOrganisations: Organisation[]): Promise<void> => {
        store.relationshipBatch = {
          isRunning: true,
          isComplete: false,
          completed: 0,
          total: selectedOrganisations.length,
          progress: 0,
          failures: [],
        };
        return new Promise<void>((resolve: () => void): void => {
          finishBatch = (): void => {
            store.relationshipBatch = {
              isRunning: false,
              isComplete: true,
              completed: selectedOrganisations.length,
              total: selectedOrganisations.length,
              progress: 100,
              failures: [],
            };
            resolve();
          };
        });
      },
    );
    const wrapper: VueWrapper = await mountSelector();
    await select(wrapper, behoerden);
    await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();
    expect(store.createOrganisationRelationships).toHaveBeenCalledExactlyOnceWith(schule, [
      behoerden[2]!,
      behoerden[1]!,
      behoerden[0]!,
    ]);
    expect(wrapper.get('[data-testid="org-selector-progress"]').text()).toContain('0%');
    expect(wrapper.find('[data-testid="org-selector-cancel-button"]').exists()).toBe(false);
    finishBatch?.();
    await flushPromises();
    expect(wrapper.get('[data-testid="org-selector-progress"]').text()).toContain('100%');
    expect(wrapper.get('[data-testid="org-selector-success"]').text()).toContain(
      '3 Beziehungen wurden erfolgreich gespeichert.',
    );
    await wrapper.get('[data-testid="org-selector-finish-button"]').trigger('click');
    expect(wrapper.emitted('relationships-updated')).toEqual([[]]);
  });

  it.each([OrganisationsTyp.Behoerde, OrganisationsTyp.Traeger])(
    'should pass the source and selected organisation to the store for a %s context',
    async (typ: OrganisationsTyp): Promise<void> => {
      const { store, schule, mountSelector }: TestState = setup();
      const context: Organisation = DoFactory.getOrganisation({ typ });
      store.currentOrganisation = context;
      store.searchedOrganisations = [schule];
      const wrapper: VueWrapper = await mountSelector(context.id);
      await select(wrapper, [schule]);
      await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
      await flushPromises();
      expect(store.createOrganisationRelationships).toHaveBeenCalledExactlyOnceWith(context, [schule]);
      expect(wrapper.get('[data-testid="org-selector-success"]').text()).toContain(
        '1 Beziehung wurde erfolgreich gespeichert.',
      );
    },
  );

  it('should ignore stale context and report a missing context without sending invalid saves', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    store.currentOrganisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    const wrapper: VueWrapper = await mountSelector();
    await select(wrapper, [behoerden[0]!]);
    store.currentSchule = null;
    await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();
    expect(store.createOrganisationRelationships).toHaveBeenCalledExactlyOnceWith(undefined, [behoerden[0]!]);
    expect(wrapper.find('[data-testid="org-selector-success"]').exists()).toBe(false);
    expect(wrapper.getComponent({ name: 'BulkErrorDialog' }).props('errors')).toHaveLength(1);
  });

  it('should continue after a translated consistency failure, count successes and export errors', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    store.errorCode = 'DETAIL_LOADING_ERROR';
    store.createOrganisationRelationships = vi.fn(
      (_contextOrganisation: Organisation | undefined, selectedOrganisations: Organisation[]): Promise<void> => {
        store.relationshipBatch = {
          isRunning: false,
          isComplete: true,
          completed: selectedOrganisations.length,
          total: selectedOrganisations.length,
          progress: 100,
          failures: [
            {
              organisation: selectedOrganisations[1]!,
              errorCode: 'SCHULAUFSICHT_SCHULE_UND_AUFSICHT_SELBER_BAUM',
            },
          ],
        };
        return Promise.resolve();
      },
    );
    const wrapper: VueWrapper = await mountSelector();
    await select(wrapper, behoerden);
    await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();
    expect(store.createOrganisationRelationships).toHaveBeenCalledExactlyOnceWith(
      store.currentSchule,
      expect.any(Array),
    );
    expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
    expect(wrapper.get('[data-testid="org-selector-success"]').text()).toContain(
      '2 Beziehungen wurden erfolgreich gespeichert.',
    );
    expect(document.body.textContent).toContain(
      'Schule und Schulaufsichtsbehörde müssen demselben Zuständigkeitsbereich zugeordnet sein.',
    );
    expect(wrapper.getComponent({ name: 'BulkErrorDialog' }).props('dialogTitle')).toBe('Zuordnung hinzufügen');
    const body: DOMWrapper<Element> = new DOMWrapper(document.body);
    expect(body.get('[data-testid="org-selector-partial-success"]').text()).toBe(
      '2 Beziehungen wurden erfolgreich gespeichert.',
    );
    const downloadSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(fileUtils, 'download').mockImplementation(vi.fn());
    await body.get('[data-testid="org-selector-bulk-error-save-button"]').trigger('click');
    expect(downloadSpy).toHaveBeenCalledWith('Fehler-Organisationsbeziehungen.csv', expect.any(Blob));
  });

  it('should show a fallback message when the store reports an unrecognised error', async (): Promise<void> => {
    const { store, behoerden, mountSelector }: TestState = setup();
    store.createOrganisationRelationships = vi.fn(
      (_contextOrganisation: Organisation | undefined, selectedOrganisations: Organisation[]): Promise<void> => {
        store.relationshipBatch = {
          isRunning: false,
          isComplete: true,
          completed: selectedOrganisations.length,
          total: selectedOrganisations.length,
          progress: 100,
          failures: selectedOrganisations.map(
            (organisation: Organisation): { organisation: Organisation; errorCode: string } => ({
              organisation,
              errorCode: 'UNKNOWN_ERROR',
            }),
          ),
        };
        return Promise.resolve();
      },
    );
    const wrapper: VueWrapper = await mountSelector();
    await select(wrapper, behoerden);
    await wrapper.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();

    expect(store.createOrganisationRelationships).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="org-selector-success"]').exists()).toBe(false);
    expect(document.body.textContent).toContain('Die Organisationsbeziehung konnte nicht gespeichert werden.');
    await new DOMWrapper(document.body).get('[data-testid="org-selector-bulk-error-discard-button"]').trigger('click');
    await new DOMWrapper(document.body).get('[data-testid="confirm-close-bulk-error-dialog-button"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="org-selector-finish-button"]').trigger('click');
    expect(wrapper.emitted('relationships-updated')).toEqual([[]]);
  });

  it('should cancel without emitting a save event', async (): Promise<void> => {
    const { mountSelector }: TestState = setup();
    const wrapper: VueWrapper = await mountSelector();
    await wrapper.get('[data-testid="org-selector-cancel-button"]').trigger('click');
    expect(wrapper.emitted('update:showComponent')).toEqual([[false]]);
    expect(wrapper.emitted('relationships-updated')).toBeUndefined();
  });
});
