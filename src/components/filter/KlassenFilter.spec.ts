import { RollenSystemRechtEnum } from '@/api-client/generated';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import {
  useOrganisationStore,
  type KlassenFilter as KlassenAutocompleteFilter,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { faker } from '@faker-js/faker';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { BaseFieldProps } from 'vee-validate';
import type { MockInstance } from 'vitest';
import { nextTick, type DefineComponent } from 'vue';
import KlassenFilter from './KlassenFilter.vue';

type Props = {
  hideDetails?: boolean;
  systemrechteForSearch?: Array<RollenSystemRechtEnum>;
  multiple: boolean;
  readonly?: boolean;
  selectedKlassen?: Organisation | Organisation[];
  selectedKlasseProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
  highlightSelection?: boolean;
  placeholderText?: string;
  administriertVon?: string[];
  parentId?: string;
};

function mountComponent(props: Partial<Props> = {}): VueWrapper {
  return mount(KlassenFilter as unknown as DefineComponent<Props>, {
    attachTo: document.getElementById('app') || '',
    props: {
      multiple: false,
      ...props,
    },
  });
}

const organisationStore: OrganisationStore = useOrganisationStore();
const authStore: AuthStore = useAuthStore();
vi.useFakeTimers();

const defaultFilter: KlassenAutocompleteFilter = {
  searchString: undefined,
  systemrechte: [RollenSystemRechtEnum.KlassenVerwalten],
  administriertVon: undefined,
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

describe('KlassenFilter', () => {
  describe.each([[undefined], ['test-component']])('when storeKey is %s', (storeKey: string | undefined) => {
    describe.each([[true], [false]])('when multiple is %s', (multiple: boolean) => {
      describe.each([[true], [false]])('when readonly is %s', (readonly: boolean) => {
        const defaultProps: Props = { multiple, readonly, parentId: storeKey };
        const testId: string = storeKey ? `${storeKey}-klasse-select` : 'klasse-select';

        test('it renders', () => {
          const wrapper: VueWrapper = mountComponent(defaultProps);
          expect(wrapper.exists()).toBe(true);
          expect(wrapper.find(`[data-testid="${testId}"]`).isVisible()).toBe(true);
        });

        test('it displays the correct placeholder', () => {
          const wrapper: VueWrapper = mountComponent({ ...defaultProps });
          const placeholder: string | undefined = wrapper
            .find(`[data-testid="${testId}"] input`)
            .attributes('placeholder');
          expect(placeholder).toBe('Klasse zuordnen');
        });

        describe.each([
          [[RollenSystemRechtEnum.KlassenVerwalten]],
          [[RollenSystemRechtEnum.KlassenVerwalten, RollenSystemRechtEnum.KlassenVerwalten]],
          [[]],
          [undefined],
        ])('when systemrechteForSearch are %s', (systemrechteForSearch: Array<RollenSystemRechtEnum> | undefined) => {
          const expectedStoreKey: string = storeKey ?? '';
          const expectedFilter: KlassenAutocompleteFilter = {
            ...defaultFilter,
            systemrechte: systemrechteForSearch,
          };

          test('it initializes store', () => {
            const spy: MockInstance = vi.spyOn(organisationStore, 'loadKlassenForFilter');
            mountComponent({
              ...defaultProps,
              systemrechteForSearch,
            });
            vi.runAllTimers();

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenLastCalledWith(expect.objectContaining(expectedFilter), expectedStoreKey);
          });

          describe.each([[''], ['string']])('when searching for %s', (searchString: string) => {
            test.runIf(readonly)('it does not trigger search', async () => {
              const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadKlassenForFilter');
              const wrapper: VueWrapper = mountComponent({
                ...defaultProps,
                systemrechteForSearch,
              });
              // clear initial loading from mock
              vi.runAllTimers();
              loadSpy.mockClear();

              const klasseSearchInput: ReturnType<VueWrapper['findComponent']> = wrapper.find(`#${testId}`);
              await klasseSearchInput.setValue(searchString);
              vi.runAllTimers();
              await flushPromises();
              expect(loadSpy).not.toHaveBeenCalled();
            });

            test.runIf(!readonly)('it triggers search', async () => {
              const expected: KlassenAutocompleteFilter = {
                ...expectedFilter,
              };
              if (searchString.length > 0) {
                expected.searchString = searchString;
              }
              const loadSpy: MockInstance = vi.spyOn(organisationStore, 'loadKlassenForFilter');
              const wrapper: VueWrapper = mountComponent({
                ...defaultProps,
                systemrechteForSearch,
              });
              const klasseSearchInput: ReturnType<VueWrapper['findComponent']> = wrapper.find(`#${testId}`);
              await klasseSearchInput.setValue(searchString);
              vi.runAllTimers();
              await flushPromises();
              expect(loadSpy).toHaveBeenLastCalledWith(expected, expectedStoreKey);
            });
          });

          describe.runIf(!readonly)('when selecting', () => {
            async function setup(): Promise<VueWrapper> {
              const wrapper: VueWrapper = mountComponent({
                ...defaultProps,
                systemrechteForSearch,
              });
              vi.runAllTimers();
              await flushPromises();
              return wrapper;
            }
            async function selectKlasse(wrapper: VueWrapper, klasse: Organisation | undefined): Promise<void> {
              const klasseAutoComplete: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent({
                name: 'v-autocomplete',
              });
              const selectedKlassen: Organisation[] | Organisation | undefined = multiple
                ? klasse
                  ? [klasse]
                  : []
                : klasse;
              await klasseAutoComplete.setValue(selectedKlassen);
              await nextTick();
              await flushPromises();
            }

            test('it emits selected class', async () => {
              const selectedKlasse: Organisation = DoFactory.getKlasse();
              const wrapper: VueWrapper = await setup();
              await selectKlasse(wrapper, selectedKlasse);
              const expectedSelection: Organisation[] | Organisation = multiple ? [selectedKlasse] : selectedKlasse;
              expect(wrapper.emitted('update:selectedKlassen')).toContainEqual([expectedSelection]);
            });

            describe('and clearing selection', () => {
              test('it triggers search', async () => {
                const wrapper: VueWrapper = await setup();
                const selectedKlasse: Organisation = DoFactory.getKlasse();
                await selectKlasse(wrapper, selectedKlasse);
                await selectKlasse(wrapper, undefined);
                const expectedSelection: Organisation[] | undefined = multiple ? [] : undefined;
                expect(wrapper.emitted('update:selectedKlassen')).toContainEqual([expectedSelection]);
              });
            });
          });
        });

        describe.each([
          {
            label: 'overrides',
            id: faker.string.uuid(),
          },
          {
            label: 'does not override',
          },
        ])('when the parent $label the selection', ({ id }: { id?: string }) => {
          test('it correctly initializes input', async () => {
            const mockKlasse: Organisation = DoFactory.getKlasse();
            if (id) {
              mockKlasse.id = id;
            }
            organisationStore.loadKlassenForFilter = vi.fn(() => {
              if (!organisationStore.klassenFilters.has(storeKey ?? '')) {
                organisationStore.klassenFilters.set(storeKey ?? '', {
                  filterResult: [],
                  total: 0,
                  loading: false,
                });
              }
              organisationStore.klassenFilters.get(storeKey ?? '')!.filterResult = [mockKlasse];
              return Promise.resolve();
            });
            const wrapper: VueWrapper = mountComponent({ ...defaultProps });
            vi.runAllTimers();
            const selectedKlassen: Props['selectedKlassen'] = id
              ? multiple
                ? [mockKlasse]
                : mockKlasse
              : multiple
                ? []
                : undefined;
            await wrapper.setProps({ selectedKlassen });
            vi.runAllTimers();
            await nextTick();
            const actualText: string = wrapper.find(`[data-testid="${testId}"]`).text();
            if (id) {
              expect(actualText).toContain(mockKlasse.name);
            } else {
              expect(actualText).toBe('');
            }
          });
        });

        describe.each([[true], [false]])('when highlightSelection is %s', (highlightSelection: boolean) => {
          test('it correctly displays highlight', async () => {
            const selectedKlasseId: string = faker.string.uuid();
            const selectedKlasse: Organisation = DoFactory.getKlasse(undefined, { id: selectedKlasseId });
            const wrapper: VueWrapper = mountComponent({
              ...defaultProps,
              highlightSelection,
            });
            await wrapper
              .findComponent({
                name: 'v-autocomplete',
              })
              .setValue(multiple ? [selectedKlasse] : selectedKlasse);

            const classes: Array<string> = wrapper.findComponent({ ref: testId }).classes();
            if (highlightSelection) {
              expect(classes).toContain('selected');
            } else {
              expect(classes).not.toContain('selected');
            }
          });
        });
      });
    });
  });

  describe('selection synchronization', () => {
    let wrapper: VueWrapper | undefined;

    afterEach((): void => {
      wrapper?.unmount();
    });

    test.each([true, false])(
      'it preserves selection focus behavior when multiple is %s',
      async (multiple: boolean): Promise<void> => {
        wrapper = mountComponent({ multiple });
        await flushPromises();
        const input: HTMLInputElement = wrapper.get('input').element;
        const klasse: Organisation = DoFactory.getKlasse();
        input.focus();
        await flushPromises();
        expect(document.activeElement).toBe(input);

        await wrapper.findComponent({ name: 'v-autocomplete' }).setValue(multiple ? [klasse] : klasse);
        await flushPromises();

        expect(document.activeElement === input).toBe(multiple);
      },
    );

    test('it does not re-emit a multi-selection echoed by the parent', async (): Promise<void> => {
      wrapper = mountComponent({ multiple: true });
      await flushPromises();
      const selection: Organisation[] = [DoFactory.getKlasse()];
      await wrapper.findComponent({ name: 'v-autocomplete' }).setValue(selection);
      await flushPromises();

      const emittedSelection: Organisation[] | undefined =
        wrapper.emitted<Organisation[][]>('update:selectedKlassen')?.[0]?.[0];
      expect(emittedSelection).toEqual(selection);
      await wrapper.setProps({ selectedKlassen: emittedSelection });
      await flushPromises();

      expect(wrapper.emitted('update:selectedKlassen')).toHaveLength(1);
    });

    test('it clears the bound search when a multi-select loses focus', async (): Promise<void> => {
      wrapper = mountComponent({ multiple: true });
      await flushPromises();
      const autocomplete: VueWrapper = wrapper.findComponent({ name: 'v-autocomplete' });
      autocomplete.vm.$emit('update:search', 'Klasse');
      await flushPromises();
      expect(autocomplete.props()).toHaveProperty('search', 'Klasse');

      autocomplete.vm.$emit('update:focused', false);
      await flushPromises();

      expect(autocomplete.props()).toHaveProperty('search', '');
    });
  });
});
