import {
  OrganisationResponseLegacy,
  RollenSystemRechtEnum,
  type PersonenkontextRolleFieldsResponse,
  type RollenSystemRechtServiceProviderIDResponse,
} from '@/api-client/generated';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type AutoCompleteStore,
  type Organisation,
  type OrganisationenFilter,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { BaseFieldProps } from 'vee-validate';
import { expectTypeOf, type MockInstance } from 'vitest';
import { nextTick, ref, type DefineComponent, type Ref } from 'vue';
import { getDisplayNameForOrg } from '@/utils/formatting';
import { OperationContext, usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import type { SelectedSchulen } from '@/types';
import SchulenFilter from './SchulenFilter.vue';

type Props = {
  includeTraeger?: boolean;
  systemrechteForSearch?: Array<RollenSystemRechtEnum>;
  multiple: boolean;
  selectionCountKey?: string;
  selectedSchulen?: SelectedSchulen;
  readonly?: boolean;
  selectedSchuleProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
  highlightSelection?: boolean;
  placeholderText?: string;
  includeAll?: boolean;
  parentId?: string;
  useWorkflowEndpoints?: boolean;
  useLandesbediensteteWorkflow?: boolean;
  operationContext?: OperationContext;
  personId?: string;
  selectedRollen?: string[];
};

enableAutoUnmount(afterEach);

function mountComponent(props: Partial<Props> = {}): VueWrapper {
  const wrapper: VueWrapper = mount(SchulenFilter as unknown as DefineComponent<Partial<Props>>, {
    attachTo: document.getElementById('app') || '',
    props,
  });
  return wrapper;
}

function expectInputDisabledAttrToBe(expected: boolean): void {
  const inputElement: Element | null = document.querySelector('#schule-select');
  expect(inputElement).not.toBeNull();
  expect(inputElement!.hasAttribute('disabled')).toBe(expected);
}

const organisationStore: OrganisationStore = useOrganisationStore();
const authStore: AuthStore = useAuthStore();
vi.useFakeTimers();

const defaultFilter: OrganisationenFilter = {
  includeTyp: OrganisationsTyp.Schule,
  systemrechte: [RollenSystemRechtEnum.KlassenVerwalten],
  limit: 25,
};

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
  organisationStore.$reset();
  authStore.$reset();
  usePersonenkontextStore().$reset();
  vi.restoreAllMocks();
  vi.clearAllTimers();
});

describe('SchulenFilter', () => {
  test('it defaults to single selection', async () => {
    expectTypeOf<SelectedSchulen<false>>().toEqualTypeOf<Organisation | undefined>();
    expectTypeOf<SelectedSchulen<true>>().toEqualTypeOf<Organisation[]>();

    const selected: Organisation = DoFactory.getSchule();
    const wrapper: VueWrapper = mountComponent();
    const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

    expect(autocomplete.props()).toHaveProperty('multiple', false);
    expect(autocomplete.props()).toHaveProperty('modelValue', null);
    await autocomplete.setValue(selected);
    expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([selected]);
    await autocomplete.setValue(null);
    expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([undefined]);
  });

  describe.each([false, true])('search debounce with workflow endpoints=%s', (useWorkflowEndpoints: boolean) => {
    test('should load only the latest search after 500ms and debounce clearing it', async (): Promise<void> => {
      const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
      const loadSpy: MockInstance = useWorkflowEndpoints
        ? vi.spyOn(personenkontextStore, 'processWorkflowStep')
        : vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
      const wrapper: VueWrapper = mountComponent({ useWorkflowEndpoints });
      await flushPromises();
      loadSpy.mockClear();
      const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

      autocomplete.vm.$emit('update:search', 'Sch');
      await nextTick();
      vi.advanceTimersByTime(400);
      autocomplete.vm.$emit('update:search', 'Schule');
      await nextTick();
      vi.advanceTimersByTime(499);
      await flushPromises();
      expect(loadSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await flushPromises();
      expect(loadSpy).toHaveBeenCalledOnce();
      expect(loadSpy.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining(useWorkflowEndpoints ? { organisationName: 'Schule' } : { searchString: 'Schule' }),
      );

      autocomplete.vm.$emit('update:search', '');
      await nextTick();
      vi.advanceTimersByTime(499);
      await flushPromises();
      expect(loadSpy).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1);
      await flushPromises();
      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(loadSpy.mock.calls[1]?.[0]).not.toHaveProperty(useWorkflowEndpoints ? 'organisationName' : 'searchString');
    });

    test('should cancel a pending search on unmount', async (): Promise<void> => {
      const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
      const loadSpy: MockInstance = useWorkflowEndpoints
        ? vi.spyOn(personenkontextStore, 'processWorkflowStep')
        : vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
      const wrapper: VueWrapper = mountComponent({ useWorkflowEndpoints });
      await flushPromises();
      loadSpy.mockClear();

      const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });
      autocomplete.vm.$emit('update:search', 'Schule');
      await nextTick();
      wrapper.unmount();
      vi.advanceTimersByTime(500);
      await flushPromises();

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe.each([false, true])('selection contract when multiple is %s', (multiple: boolean) => {
    test('it normalizes empty Vuetify selections', async () => {
      const selected: Organisation = DoFactory.getSchule();
      const wrapper: VueWrapper = mountComponent({
        multiple,
        selectedSchulen: multiple ? [selected] : selected,
        highlightSelection: true,
      });
      const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

      await autocomplete.setValue(null);
      expect(autocomplete.props()).toHaveProperty('modelValue', multiple ? [] : null);
      expect(wrapper.emitted('update:selectedSchulen')).toEqual([[multiple ? [] : undefined]]);
      expect(autocomplete.classes()).not.toContain('selected');
    });

    test('it synchronizes selections replaced and cleared by the parent', async () => {
      const initial: Organisation = DoFactory.getSchule();
      const replacement: Organisation = DoFactory.getSchule();
      const wrapper: VueWrapper = mountComponent({
        multiple,
        selectedSchulen: multiple ? [initial] : initial,
      });
      const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

      await wrapper.setProps({ selectedSchulen: multiple ? [replacement] : replacement });
      expect(autocomplete.props()).toHaveProperty('modelValue', multiple ? [replacement] : replacement);
      expect(wrapper.text()).toContain(getDisplayNameForOrg(replacement));
      await wrapper.setProps({ selectedSchulen: undefined });
      expect(autocomplete.props()).toHaveProperty('modelValue', multiple ? [] : null);
      expect(wrapper.emitted('update:selectedSchulen')).toBeUndefined();
    });

    test('it emits autoselected Schulen in the matching selection shape', async () => {
      const selected: PersonenkontextRolleFieldsResponse['organisation'] = DoFactory.getOrganisationResponse();
      authStore.currentUser = DoFactory.getUserinfoResponse({
        personenkontexte: [
          DoFactory.getPersonenkontextRolleFieldsResponse({
            organisation: selected,
            rolle: DoFactory.getRollenSystemRechtServiceProviderIDResponse({
              systemrechte: [RollenSystemRechtEnum.KlassenVerwalten],
            }),
          }),
        ],
      });
      const wrapper: VueWrapper = mountComponent({
        multiple,
        systemrechteForSearch: [RollenSystemRechtEnum.KlassenVerwalten],
      });
      await flushPromises();

      expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([multiple ? [selected] : selected]);
      expect(wrapper.findComponent({ name: 'v-autocomplete' }).props()).toHaveProperty(
        'modelValue',
        multiple ? [selected] : selected,
      );
      expectInputDisabledAttrToBe(true);
    });
  });

  test('it reflects in-place changes to the parent selection', async () => {
    const initial: Organisation = DoFactory.getSchule();
    const added: Organisation = DoFactory.getSchule();
    const selection: Ref<Organisation[]> = ref([initial]);
    const wrapper: VueWrapper = mountComponent({
      multiple: true,
      selectedSchulen: selection.value,
      highlightSelection: true,
    });
    const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

    selection.value.push(added);
    await nextTick();
    expect(autocomplete.props()).toHaveProperty('modelValue', [initial, added]);
    expect(autocomplete.props()).toHaveProperty('items', expect.arrayContaining([added]));

    selection.value.splice(0);
    await nextTick();
    expect(autocomplete.props()).toHaveProperty('modelValue', []);
    expect(autocomplete.classes()).not.toContain('selected');
    expect(wrapper.emitted('update:selectedSchulen')).toBeUndefined();
  });

  test('it displays an initial object outside current results without resolving its ID', async () => {
    const selected: Organisation = DoFactory.getSchule();
    const result: Organisation = DoFactory.getSchule();
    const wrapper: VueWrapper = mountComponent({ selectedSchulen: selected });
    organisationStore.organisationenFilters.set('', { filterResult: [result], total: 80, loading: false });
    await nextTick();

    const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });
    expect(autocomplete.props()).toHaveProperty('items', [result, selected]);
    expect(autocomplete.props()).toHaveProperty('modelValue', selected);
    expect(wrapper.text()).toContain(getDisplayNameForOrg(selected));
    expect(organisationStore.organisationenFilters.get('')?.total).toBe(80);
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
    expect(organisationStore.loadOrganisationForSelection).not.toHaveBeenCalled();
  });

  test.each([false, true])(
    'it revalidates retained objects in changed workflow contexts (Landesbedienstete=%s)',
    async (useLandesbediensteteWorkflow: boolean) => {
      const selected: Organisation = DoFactory.getSchule();
      const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
      const process: MockInstance = vi.mocked(
        useLandesbediensteteWorkflow
          ? personenkontextStore.processWorkflowStepLandesbedienstete
          : personenkontextStore.processWorkflowStep,
      );
      const wrapper: VueWrapper = mountComponent({
        selectedSchulen: selected,
        readonly: true,
        useWorkflowEndpoints: true,
        useLandesbediensteteWorkflow,
        operationContext: OperationContext.PERSON_ANLEGEN,
      });
      await flushPromises();
      expect(process).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ organisationId: selected.id }));

      personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse({
        organisations: [],
        canCommit: false,
      });
      process.mockClear();
      await wrapper.setProps({ operationContext: OperationContext.PERSON_BEARBEITEN, personId: 'another-person' });
      await flushPromises();

      expect(process).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          organisationId: selected.id,
          operationContext: OperationContext.PERSON_BEARBEITEN,
          personId: 'another-person',
        }),
      );
      expect(wrapper.findComponent({ name: 'v-autocomplete' }).props()).toHaveProperty('modelValue', selected);
      expect(personenkontextStore.workflowStepResponse.canCommit).toBe(false);
      expect(organisationStore.loadOrganisationForSelection).not.toHaveBeenCalled();
    },
  );

  test('it validates the selected object again when switching workflow variants', async () => {
    const selected: Organisation = DoFactory.getSchule();
    const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
    const wrapper: VueWrapper = mountComponent({
      selectedSchulen: selected,
      readonly: true,
      useWorkflowEndpoints: true,
    });
    await flushPromises();
    expect(personenkontextStore.processWorkflowStep).toHaveBeenCalledOnce();
    expect(personenkontextStore.processWorkflowStepLandesbedienstete).not.toHaveBeenCalled();

    await wrapper.setProps({ useLandesbediensteteWorkflow: true });
    await flushPromises();
    expect(personenkontextStore.processWorkflowStepLandesbedienstete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ organisationId: selected.id }),
    );
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
    expect(organisationStore.loadOrganisationForSelection).not.toHaveBeenCalled();
  });

  describe.each([[false], [true]])('when multiple is %s', (multiple: boolean) => {
    describe.each([[true], [false]])('when readonly is %s', (readonly: boolean) => {
      const defaultProps: Props = { multiple, readonly };

      test('it renders', () => {
        const wrapper: VueWrapper = mountComponent(defaultProps);
        expect(wrapper.find('[data-testid="schule-select"]').isVisible()).toBe(true);
      });

      type AutoselectTestData = {
        label: string;
        autoSelectedSchule: PersonenkontextRolleFieldsResponse['organisation'] | null;
      };
      const tempSchule: PersonenkontextRolleFieldsResponse['organisation'] = DoFactory.getOrganisationResponse({
        id: 'auto-selected-schule-id',
      });
      describe.each([
        {
          label: 'auto-selected',
          autoSelectedSchule: tempSchule,
        },
        {
          label: 'not auto-selected',
          autoSelectedSchule: null,
        },
      ])('when schule is $label', ({ autoSelectedSchule }: AutoselectTestData) => {
        const rolle: RollenSystemRechtServiceProviderIDResponse =
          DoFactory.getRollenSystemRechtServiceProviderIDResponse({
            systemrechte: [RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.SchulenVerwalten],
          });
        beforeEach(() => {
          authStore.currentUser = DoFactory.getUserinfoResponse({
            personenkontexte: autoSelectedSchule
              ? [
                  DoFactory.getPersonenkontextRolleFieldsResponse({
                    organisation: autoSelectedSchule,
                    rolle,
                  }),
                ]
              : [
                  DoFactory.getPersonenkontextRolleFieldsResponse({
                    rolle,
                  }),
                  DoFactory.getPersonenkontextRolleFieldsResponse({
                    rolle,
                  }),
                  {
                    organisation: tempSchule,
                    rolle,
                  },
                ],
          });
        });

        test('it correctly sets disabled-attribute on input', async () => {
          const autoselected: boolean = autoSelectedSchule != null;
          const wrapper: VueWrapper = mountComponent({ ...defaultProps });
          expectInputDisabledAttrToBe(readonly || autoselected);
          wrapper.setProps({ readonly: !readonly });
          await nextTick();
          expectInputDisabledAttrToBe(!readonly || autoselected);
        });

        test('it displays the selected organisation before fetching data', async () => {
          const mockSchule: Organisation = DoFactory.getSchule();

          const wrapper: VueWrapper = mountComponent({ ...defaultProps });
          await wrapper.setProps({ selectedSchulen: multiple ? [mockSchule] : mockSchule });
          // no timers are run, so this is before fetching data
          const actualText: string = wrapper.find('[data-testid="schule-select"]').text();
          expect(actualText).toContain(getDisplayNameForOrg(mockSchule));
        });

        describe.each([
          [[RollenSystemRechtEnum.KlassenVerwalten]],
          [[RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.SchulenVerwalten]],
          [[]],
          [undefined],
        ])('when systemrechteForSearch are %s', (systemrechteForSearch: Array<RollenSystemRechtEnum> | undefined) => {
          describe.each([[true], [false]])('when includeAll is %s', (includeAll: boolean) => {
            const expectedFilter: OrganisationenFilter = {
              ...defaultFilter,
              systemrechte: systemrechteForSearch,
            };
            if (includeAll) {
              expectedFilter.excludeTyp = [OrganisationsTyp.Klasse];
              delete expectedFilter.includeTyp;
            } else {
              expectedFilter.includeTyp = OrganisationsTyp.Schule;
              delete expectedFilter.excludeTyp;
            }

            test('it initializes store', () => {
              const spy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
              mountComponent({
                ...defaultProps,
                includeAll,
                systemrechteForSearch,
              });
              vi.runAllTimers();
              if (autoSelectedSchule != null) {
                expect(spy).not.toHaveBeenCalled();
              } else {
                expect(spy).toHaveBeenCalledOnce();
                expect(spy).toHaveBeenLastCalledWith(expectedFilter, undefined);
              }
            });

            describe.each([[''], ['string']])('when searching for %s', (searchString: string) => {
              test.runIf(readonly)('it does not trigger search', async () => {
                const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                const wrapper: VueWrapper = mountComponent({
                  ...defaultProps,
                  includeAll,
                  systemrechteForSearch,
                });
                // clear initial loading from mock
                vi.runAllTimers();
                loadSpy.mockClear();

                const schuleSearchInput: ReturnType<VueWrapper['findComponent']> = wrapper.find(
                  includeAll ? '#organisation-select' : '#schule-select',
                );
                await schuleSearchInput.setValue(searchString);
                vi.runAllTimers();
                await flushPromises();
                expect(loadSpy).not.toHaveBeenCalled();
              });
              test.runIf(!readonly && !autoSelectedSchule)('it triggers search', async () => {
                const expected: OrganisationenFilter = {
                  ...expectedFilter,
                };
                if (searchString.length > 0) {
                  expected.searchString = searchString;
                }
                const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                const wrapper: VueWrapper = mountComponent({
                  ...defaultProps,
                  includeAll,
                  systemrechteForSearch,
                });
                const schuleSearchInput: ReturnType<VueWrapper['findComponent']> = wrapper.find(
                  includeAll ? '#organisation-select' : '#schule-select',
                );
                await schuleSearchInput.setValue(searchString);
                vi.runAllTimers();
                await flushPromises();
                expect(loadSpy).toHaveBeenLastCalledWith(expected, undefined);
              });
            });

            describe.runIf(!readonly && !autoSelectedSchule)('when selecting', () => {
              async function setup(): Promise<VueWrapper> {
                const wrapper: VueWrapper = mountComponent({
                  ...defaultProps,
                  includeAll,
                  systemrechteForSearch,
                });
                vi.runAllTimers();
                await flushPromises();
                return wrapper;
              }
              async function selectSchule(wrapper: VueWrapper, schule: Organisation | undefined): Promise<void> {
                const schuleAutoComplete: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent({
                  name: 'v-autocomplete',
                });
                await schuleAutoComplete.setValue(multiple ? (schule ? [schule] : []) : (schule ?? null));
                vi.runAllTimers();
                await flushPromises();
              }

              test('it keeps selection IDs out of the search filter', async () => {
                const selectedSchule: Organisation = DoFactory.getSchule();
                const wrapper: VueWrapper = await setup();
                const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                await selectSchule(wrapper, selectedSchule);
                expect(loadSpy).toHaveBeenLastCalledWith(expectedFilter, undefined);
                expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([
                  multiple ? [selectedSchule] : selectedSchule,
                ]);
              });

              describe('it triggers clearing selection', () => {
                test('it triggers search', async () => {
                  const wrapper: VueWrapper = await setup();
                  await selectSchule(wrapper, DoFactory.getSchule());
                  const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                  await selectSchule(wrapper, undefined);
                  expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([multiple ? [] : undefined]);
                  expect(loadSpy).toHaveBeenLastCalledWith(expectedFilter, undefined);
                });
              });
            });
          });
        });

        describe.each([[true], [false]])('when highlightSelection is %s', (highlightSelection: boolean) => {
          test('it correctly displays highlight', async () => {
            const selectedSchule: Organisation = DoFactory.getSchule();
            const wrapper: VueWrapper = mountComponent({
              ...defaultProps,
              highlightSelection,
            });
            await wrapper
              .findComponent({
                name: 'v-autocomplete',
              })
              .setValue(multiple ? [selectedSchule] : selectedSchule);

            const classes: Array<string> = wrapper.findComponent({ ref: 'schule-select' }).classes();
            if (highlightSelection || autoSelectedSchule) {
              expect(classes).toContain('selected');
            } else {
              expect(classes).not.toContain('selected');
            }
          });
        });
      });
    });
  });

  describe('when multiple schools are selected', () => {
    const setup = (): { schule1: Organisation; schule2: Organisation } => {
      const schule1: Organisation = DoFactory.getSchule();
      const schule2: Organisation = DoFactory.getSchule();
      const filterEntry: AutoCompleteStore<Organisation> = {
        filterResult: [schule1, schule2],
        total: 2,
        loading: false,
      };

      organisationStore.organisationenFilters.set('', filterEntry);

      return { schule1, schule2 };
    };

    describe('when selectionCountKey is not provided', () => {
      test('it uses the default key to display the selection count', async () => {
        const { schule1, schule2 }: { schule1: Organisation; schule2: Organisation } = setup();

        const wrapper: VueWrapper = mountComponent({
          multiple: true,
          selectedSchulen: [schule1, schule2],
        });

        await flushPromises();
        expect(wrapper.find('[data-testid="schule-select"]').text()).toContain('2 Schulen ausgewählt');
      });

      describe.each([false, true])('when workflow endpoints are %s', (useWorkflowEndpoints: boolean) => {
        test('it keeps the selected object when the search is cleared', async () => {
          const organisation: Organisation = DoFactory.getSchule();
          const wrapper: VueWrapper = mountComponent({
            multiple: false,
            selectedSchulen: organisation,
          });
          await wrapper.setProps({ useWorkflowEndpoints });
          const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });
          autocomplete.vm.$emit('update:search', 'another organisation');
          await nextTick();
          autocomplete.vm.$emit('update:search', '');
          await nextTick();
          expect(autocomplete.props()).toHaveProperty('modelValue', organisation);
          expect(wrapper.find('[data-testid="schule-select"]').text()).toContain(getDisplayNameForOrg(organisation));
        });

        test('it retains only current selections with new results without mutating the store', async () => {
          const first: Organisation = DoFactory.getSchule();
          const second: Organisation = DoFactory.getSchule();
          const result: Organisation = DoFactory.getSchule();
          const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
          personenkontextStore.$reset();
          const wrapper: VueWrapper = mountComponent({ multiple: true });
          await wrapper.setProps({ useWorkflowEndpoints });
          const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });

          await autocomplete.setValue([first]);
          await autocomplete.setValue([first, second]);
          await autocomplete.setValue([second]);
          const results: Organisation[] = [result, second];
          const workflowResults: OrganisationResponseLegacy[] = [
            DoFactory.getOrganisationenResponseLegacy(result),
            DoFactory.getOrganisationenResponseLegacy(second),
          ];
          if (useWorkflowEndpoints) {
            personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse({
              organisations: workflowResults,
            });
          } else {
            organisationStore.organisationenFilters.set('', { filterResult: results, total: 2, loading: false });
          }
          await nextTick();

          expect(autocomplete.props()).toHaveProperty('returnObject', true);
          expect(autocomplete.props()).toHaveProperty(
            'items',
            useWorkflowEndpoints ? workflowResults : [result, second],
          );
          expect(results).toEqual([result, second]);
          expect(wrapper.emitted('update:selectedSchulen')?.at(-1)).toEqual([[second]]);
          expect(wrapper.emitted('update:selectedSchulenObjects')).toBeUndefined();
        });
      });
    });

    describe('when selectionCountKey is provided', () => {
      test('it uses a custom selectionCountKey to display the selection count', async () => {
        const { schule1, schule2 }: { schule1: Organisation; schule2: Organisation } = setup();

        const wrapper: VueWrapper = mountComponent({
          multiple: true,
          selectionCountKey: 'admin.rolle.administrationsebenenSelected',
          selectedSchulen: [schule1, schule2],
        });

        await flushPromises();
        expect(wrapper.find('[data-testid="schule-select"]').text()).toContain('2 Administrationsebenen ausgewählt');
      });
    });
  });
});
