import {
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
import { faker } from '@faker-js/faker';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { BaseFieldProps } from 'vee-validate';
import type { MockInstance } from 'vitest';
import { nextTick, ref, type Ref } from 'vue';
import SchulenFilter from './SchulenFilter.vue';

type Props = {
  includeTraeger?: boolean;
  systemrechteForSearch?: Array<RollenSystemRechtEnum>;
  multiple: boolean;
  selectionCountKey?: string;
  selectedSchulen?: Array<string> | string;
  readonly?: boolean;
  selectedSchuleProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
  highlightSelection?: boolean;
  placeholderText?: string;
  includeAll?: boolean;
  parentId?: string;
};

function mountComponent(props: Partial<Props> = {}): VueWrapper<InstanceType<typeof SchulenFilter>> {
  return mount<typeof SchulenFilter>(SchulenFilter, {
    attachTo: document.getElementById('app') || '',
    props: {
      multiple: false,
      ...props,
    },
  });
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
  organisationIds: [],
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
  vi.restoreAllMocks();
  vi.clearAllTimers();
});

describe('SchulenFilter', () => {
  describe.each([[false], [true]])('when multiple is %s', (multiple: boolean) => {
    describe.each([[true], [false]])('when readonly is %s', (readonly: boolean) => {
      const defaultProps: Props = { multiple, readonly };

      test('it renders', () => {
        const wrapper: VueWrapper = mountComponent(defaultProps) as VueWrapper;
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
          const wrapper: VueWrapper = mountComponent({ ...defaultProps }) as VueWrapper;
          expectInputDisabledAttrToBe(readonly || autoselected);
          wrapper.setProps({ readonly: !readonly });
          await nextTick();
          expectInputDisabledAttrToBe(!readonly || autoselected);
        });

        test('it displays the correct placeholder', async () => {
          const mockSchule: Organisation = DoFactory.getSchule();
          const selectionRef: Ref<Array<string> | string | undefined> = ref(multiple ? [mockSchule.id] : mockSchule.id);

          const wrapper: VueWrapper = mountComponent({ ...defaultProps }) as VueWrapper;
          await wrapper.setProps({ selectedSchulen: selectionRef });
          // no timers are run, so this is before fetching data
          const actualText: string = wrapper.find('[data-testid="schule-select"]').text();
          expect(actualText).toContain('...');
        });

        describe.each([
          [[RollenSystemRechtEnum.KlassenVerwalten]],
          [[RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.SchulenVerwalten]],
          [[]],
          [undefined],
        ])('when systemrechteForSearch are %s', (systemrechteForSearch: Array<RollenSystemRechtEnum> | undefined) => {
          const expectedIdsInFilter: OrganisationenFilter['organisationIds'] =
            ((): OrganisationenFilter['organisationIds'] => {
              if (autoSelectedSchule) {
                return [autoSelectedSchule.id];
              }
              return [];
            })();
          describe.each([[true], [false]])('when includeAll is %s', (includeAll: boolean) => {
            const expectedFilter: OrganisationenFilter = {
              ...defaultFilter,
              systemrechte: systemrechteForSearch,
              organisationIds: expectedIdsInFilter,
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
                }) as VueWrapper;
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
                }) as VueWrapper;
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
                }) as VueWrapper;
                vi.runAllTimers();
                await flushPromises();
                return wrapper;
              }
              async function selectSchule(wrapper: VueWrapper, id: string | undefined): Promise<void> {
                const schuleAutoComplete: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent({
                  name: 'v-autocomplete',
                });
                await schuleAutoComplete.setValue(id);
                vi.runAllTimers();
                await flushPromises();
              }

              test('it triggers search', async () => {
                const selectedSchuleId: string = faker.string.uuid();
                const wrapper: VueWrapper = await setup();
                const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                await selectSchule(wrapper, selectedSchuleId);
                const expected: OrganisationenFilter = {
                  ...expectedFilter,
                  organisationIds: [...(expectedIdsInFilter ?? []), selectedSchuleId],
                };
                expect(loadSpy).toHaveBeenLastCalledWith(expected, undefined);
              });

              describe('it triggers clearing selection', () => {
                test('it triggers search', async () => {
                  const wrapper: VueWrapper = await setup();
                  await selectSchule(wrapper, faker.string.uuid());
                  const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadOrganisationenForFilter');
                  await selectSchule(wrapper, undefined);
                  const expected: OrganisationenFilter = {
                    ...expectedFilter,
                    organisationIds: [...(expectedIdsInFilter ?? [])],
                  };
                  expect(loadSpy).toHaveBeenLastCalledWith(expected, undefined);
                });
              });
            });
          });
        });

        describe.each([[true], [false]])('when highlightSelection is %s', (highlightSelection: boolean) => {
          test('it correctly displays highlight', async () => {
            const selectedSchuleId: string = faker.string.uuid();
            const wrapper: VueWrapper = mountComponent({
              ...defaultProps,
              highlightSelection,
            }) as VueWrapper;
            await wrapper
              .findComponent({
                name: 'v-autocomplete',
              })
              .setValue(selectedSchuleId);

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
          selectedSchulen: [schule1.id, schule2.id],
        }) as VueWrapper;

        await flushPromises();
        expect(wrapper.find('[data-testid="schule-select"]').text()).toContain('2 Schulen ausgewählt');
      });
    });

    describe('when selectionCountKey is provided', () => {
      test('it uses a custom selectionCountKey to display the selection count', async () => {
        const { schule1, schule2 }: { schule1: Organisation; schule2: Organisation } = setup();

        const wrapper: VueWrapper = mountComponent({
          multiple: true,
          selectionCountKey: 'admin.rolle.administrationsebenenSelected',
          selectedSchulen: [schule1.id, schule2.id],
        }) as VueWrapper;

        await flushPromises();
        expect(wrapper.find('[data-testid="schule-select"]').text()).toContain('2 Administrationsebenen ausgewählt');
      });
    });
  });
});
