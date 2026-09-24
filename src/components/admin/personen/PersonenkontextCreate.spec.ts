import { RollenArt, RollenMerkmal } from '@/api-client/generated';
import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import {
  CreationType,
  OperationContext,
  usePersonenkontextStore,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import { flushPromises, VueWrapper, mount, enableAutoUnmount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import type { BefristungProps } from './BefristungInput.vue';
import PersonenkontextCreate from './PersonenkontextCreate.vue';

let wrapper: VueWrapper | null = null;
let personenkontextStore: PersonenkontextStore;
let organisationStore: OrganisationStore;
let rolleStore: RolleStore;
const personStore: PersonStore = usePersonStore();
const klassenFilterRef: string = 'personenkontext-create-klasse-select';
vi.useFakeTimers();
enableAutoUnmount(afterEach);

const mountComponent = (
  props: Record<string, unknown> = {},
): VueWrapper<InstanceType<typeof PersonenkontextCreate>> => {
  return mount(PersonenkontextCreate, {
    attachTo: document.getElementById('app') || '',
    props: {
      operationContext: OperationContext.PERSON_ANLEGEN,
      errorCode: '',
      disabled: false,
      organisationen: [
        {
          title: 'orga',
          value: '1133',
        },
        {
          title: 'orga1',
          value: '1134',
        },
      ],
      rollen: [
        {
          value: '54321',
          title: 'Lern',
          rollenart: RollenArt.Lern,
        },
        {
          value: '54329',
          title: 'Lehr',
          merkmale: [RollenMerkmal.KopersPflicht],
          rollenart: RollenArt.Lehr,
        },
      ],
      selectedOrganisationProps: {
        error: false,
        'error-messages': [],
        onBlur: () => vi.fn(),
        onChange: () => vi.fn(),
        onInput: () => vi.fn(),
      },
      selectedRolleProps: {
        error: false,
        'error-messages': [],
        onBlur: () => vi.fn(),
        onChange: () => vi.fn(),
        onInput: () => vi.fn(),
      },
      selectedKlasseProps: {
        error: false,
        'error-messages': [],
        onBlur: () => vi.fn(),
        onChange: () => vi.fn(),
        onInput: () => vi.fn(),
      },
      selectedOrganisation: '',
      selectedRolle: '',
      selectedKlasse: '',
      showHeadline: true,
      befristungInputProps: {
        befristungProps: {
          error: false,
          'error-messages': [],
          onBlur: () => vi.fn(),
          onChange: () => vi.fn(),
          onInput: () => vi.fn(),
        },
        befristungOptionProps: {
          error: false,
          'error-messages': [],
          onBlur: () => vi.fn(),
          onChange: () => vi.fn(),
          onInput: () => vi.fn(),
        },
        isUnbefristetDisabled: false,
        isBefristungRequired: false,
        nextSchuljahresende: '2024-07-31',
        befristung: undefined,
        befristungOption: undefined,
      } as BefristungProps,
      ...props,
    },
    global: {
      components: {
        PersonenkontextCreate: PersonenkontextCreate as Component,
      },
    },
  });
};

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
  personenkontextStore = usePersonenkontextStore();
  organisationStore = useOrganisationStore();
  rolleStore = useRolleStore();

  personenkontextStore.workflowStepResponse = {
    organisations: [
      {
        id: '1133',
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

  const mockPersonenuebersicht: PersonenUebersicht = new PersonenUebersicht(
    '1',
    'John',
    'Orton',
    'jorton',
    Date.now().toLocaleString(),
    [DoFactory.getZuordnung(), DoFactory.getZuordnung(), DoFactory.getZuordnung()],
  );

  personStore.personenuebersicht = mockPersonenuebersicht;
  organisationStore.klassen = [DoFactory.getKlasse()];
});

describe('PersonenkontextCreate', () => {
  describe.each([[OperationContext.PERSON_ANLEGEN], [OperationContext.PERSON_BEARBEITEN]])(
    'when operationContext is %s',
    (operationContext: OperationContext) => {
      describe.each([[true], [false]])('when allowMultipleRollen is %s', (allowMultipleRollen: boolean) => {
        async function selectRolle(rolleId?: string): Promise<VueWrapper | undefined> {
          const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({
            ref: allowMultipleRollen ? 'rollen-select' : 'rolle-select',
          });
          // Maybe not necessary since its not an optional prop
          if (!rolleAutocomplete || !rolleId) {
            return rolleAutocomplete;
          }

          rolleAutocomplete.vm.$emit('update:search', rolleId);
          await rolleAutocomplete.setValue(allowMultipleRollen ? [rolleId] : rolleId);
          return rolleAutocomplete;
        }

        beforeEach(() => {
          wrapper = mountComponent({
            operationContext,
            allowMultipleRollen,
          });
        });

        afterEach(() => {
          organisationStore.$reset();
        });

        test('it renders the component', () => {
          expect(wrapper?.findComponent({ ref: 'schulenFilter' }).isVisible()).toBe(true);
        });

        test('it updates search and sets values selected rolle, organisation and klasse', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          organisationAutocomplete?.vm.$emit('update:search', '1133');
          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          await selectRolle('54321');
          await nextTick();

          expect(organisationAutocomplete?.text()).toEqual('string (orga)');
          await nextTick();

          organisationStore.klassenFilters.set('personenkontext-create', {
            loading: false,
            total: 1,
            filterResult: [
              DoFactory.getKlasse(undefined, {
                id: '55555',
                name: '55555',
              }),
            ],
          });
          const klasseAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ name: 'KlassenFilter' })
            .findComponent({ ref: klassenFilterRef });
          klasseAutocomplete?.vm.$emit('update:search', '55555');
          await klasseAutocomplete?.setValue('55555');
          await nextTick();

          expect(klasseAutocomplete?.text()).toEqual('55555');
        });

        test('it resets field Rolle when Organisation is reset after being selected', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('O1');
          await nextTick();

          const rolleAutocomplete: VueWrapper | undefined = await selectRolle('54321');
          await nextTick();

          await organisationAutocomplete?.setValue(undefined);
          await nextTick();

          expect(rolleAutocomplete?.exists()).toBe(false);
        });

        test('it resets field Klasse when Rolle is reset after being selected', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('O1');
          await nextTick();

          await selectRolle('54321');
          await nextTick();

          const klassenAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ name: 'KlassenFilter' })
            .findComponent({ ref: klassenFilterRef });
          await klassenAutocomplete?.setValue('O1');
          await nextTick();

          await organisationAutocomplete?.setValue(undefined);
          await nextTick();

          expect(klassenAutocomplete?.exists()).toBe(false);
        });

        test('Fetches all Klassen if the searchValue is empty', async () => {
          const spy: MockInstance = vi.spyOn(organisationStore, 'loadKlassenForFilter');
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('O1');
          await nextTick();

          await selectRolle('54321');
          await nextTick();

          const klassenAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ name: 'KlassenFilter' })
            .findComponent({ ref: klassenFilterRef });
          await klassenAutocomplete?.setValue('');
          klassenAutocomplete?.vm.$emit('update:search', '');
          await nextTick();
          vi.runAllTimers();

          expect(spy).toHaveBeenCalled();
        });

        test('it updates Organisation search correctly', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          await organisationAutocomplete?.setValue(undefined);
          await nextTick();

          organisationAutocomplete?.vm.$emit('update:search', '');
          await nextTick();
          expect(personenkontextStore.processWorkflowStep).toHaveBeenCalled();
        });

        test('it does nothing if the oldValue is equal to what is selected on Organisation', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          // Set a value in orga that will match with something given by the props and so the component will calculate the selectedOrganisationTitle
          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          // Set the searchValue to 'orga' which matches the title before
          organisationAutocomplete?.vm.$emit('update:search', 'orga');
          await nextTick();

          // Set the newValue to '' and the oldValue is in this case 'orga' and so the method should just return
          organisationAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          expect(organisationAutocomplete?.text()).toEqual('string (orga)');
        });

        test('it does nothing if the oldValue is equal to what is selected on Rolle', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          // Set a value in orga that will match with something given by the props and so the component will calculate the selectedRolleTitle
          const rolleAutocomplete: VueWrapper | undefined = await selectRolle('54321');
          await nextTick();

          // Set the searchValue to 'Lern' which matches the title before
          rolleAutocomplete?.vm.$emit('update:search', 'Lern');
          await nextTick();

          // Set the newValue to '' and the oldValue is in this case 'Lern' and so the method should just return
          rolleAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          expect(rolleAutocomplete?.text()).toEqual('Lern');
        });

        test('it sends a request if the newValue is empty and the selectedRolle is not defined', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          // Set a value in orga that will match with something given by the props and so the component will calculate the selectedRolleTitle
          const rolleAutocomplete: VueWrapper | undefined = await selectRolle('54321');
          await nextTick();

          // Set the searchValue to 'Lern' which matches the title before
          rolleAutocomplete?.vm.$emit('update:search', 'Lern');
          await nextTick();

          await rolleAutocomplete?.setValue(undefined);
          await nextTick();

          // Set the newValue to '' and the oldValue is in this case 'Lern' and so the method should just return
          rolleAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          expect(rolleAutocomplete?.text()).toEqual('');
          expect(personenkontextStore.processWorkflowStep).toHaveBeenCalledWith({
            operationContext,
            organisationId: '1133',
            personId: undefined,
            rollenIds: ['54321'],
            limit: 25,
          });
        });

        test('it sends a request if the newValue is empty and the selected Organisation is not defined', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          organisationAutocomplete?.vm.$emit('update:search', 'Lern');
          await nextTick();

          await organisationAutocomplete?.setValue(undefined);
          await nextTick();

          organisationAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          expect(organisationAutocomplete?.text()).toEqual('');
        });

        test('it sends a request if the newValue is empty and the selected Organisation is defined', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });

          await organisationAutocomplete?.setValue('1133');
          await nextTick();

          organisationAutocomplete?.vm.$emit('update:search', 'Lern');
          await nextTick();

          organisationAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          expect(organisationAutocomplete?.text()).toEqual('string (orga)');
        });

        test('Do nothing with Klassen if the orga was reset', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('O1');
          await nextTick();

          await selectRolle('54321');
          await nextTick();

          const klassenAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ name: 'KlassenFilter' })
            .findComponent({ ref: klassenFilterRef });
          klassenAutocomplete?.vm.$emit('update:search', '');
          await nextTick();

          await organisationAutocomplete?.setValue(undefined);
          await nextTick();

          expect(klassenAutocomplete?.text()).toBeFalsy();
        });

        it('emits update:calculatedBefristungOption event', async () => {
          // Simulate selecting organization and role to enable Befristung input
          await wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' })
            .setValue('org1');
          await selectRolle('rolle1');

          // Get the BefristungInput component
          const befristungInput: VueWrapper | undefined = wrapper?.findComponent({ name: 'BefristungInput' });

          // Emit the event from the child component
          befristungInput?.vm.$emit('update:calculatedBefristungOption', 'someOption');

          // Assert that the parent component emitted the event
          expect(wrapper?.emitted('update:calculatedBefristungOption')).toBeTruthy();
          expect(wrapper?.emitted('update:calculatedBefristungOption')![0]).toEqual(['someOption']);
        });

        test('it loads Rollen for the initially selected organisation without debouncing', async () => {
          wrapper = mountComponent({
            operationContext,
            allowMultipleRollen,
            selectedOrganisation: '1133',
          });
          await flushPromises();

          expect(rolleStore.getRollenForPersonenkontextCreation).toHaveBeenCalledWith(
            expect.objectContaining({
              organisationId: '1133',
              limit: 25,
            }),
          );
        });

        test.each([
          [undefined, undefined, false],
          [CreationType.Limited, undefined, false],
          [CreationType.AddPersonToOwnSchule, undefined, true],
          [undefined, '1', true],
        ])(
          'it includes rollenartOfUser for existing-person workflows (%s, personId: %s)',
          async (
            createType: CreationType | undefined,
            personId: string | undefined,
            includesRollenartOfUser: boolean,
          ) => {
            wrapper = mountComponent({
              operationContext,
              allowMultipleRollen,
              createType,
              personId,
              selectedOrganisation: '1133',
            });
            await flushPromises();

            const getRollenForPersonenkontextCreationSpy: MockInstance = vi.mocked(
              rolleStore.getRollenForPersonenkontextCreation,
            );
            if (includesRollenartOfUser) {
              expect(getRollenForPersonenkontextCreationSpy).toHaveBeenLastCalledWith(
                expect.objectContaining({
                  rollenartOfUser: personStore.personenuebersicht?.zuordnungen[0]?.rollenArt,
                }),
              );
            } else {
              expect(getRollenForPersonenkontextCreationSpy).toHaveBeenLastCalledWith(
                expect.not.objectContaining({ rollenartOfUser: expect.anything() as unknown }),
              );
            }
          },
        );

        test('it debounces the request when the role search input changes', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('1133');
          await nextTick();
          await flushPromises();
          vi.mocked(rolleStore.getRollenForPersonenkontextCreation).mockClear();

          const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({
            ref: allowMultipleRollen ? 'rollen-select' : 'rolle-select',
          });
          // Use a search term not matching any existing Rolle title so the filter treats it as a new search
          rolleAutocomplete?.vm.$emit('update:search', 'Direktorin');
          await nextTick();

          expect(rolleStore.getRollenForPersonenkontextCreation).not.toHaveBeenCalled();

          vi.advanceTimersByTime(500);
          await flushPromises();

          expect(rolleStore.getRollenForPersonenkontextCreation).toHaveBeenCalledWith(
            expect.objectContaining({
              organisationId: '1133',
              rolleName: 'Direktorin',
            }),
          );
        });

        test('it reloads Rollen immediately once a Rolle is selected', async () => {
          const organisationAutocomplete: VueWrapper | undefined = wrapper
            ?.findComponent({ ref: 'schulenFilter' })
            .findComponent({ ref: 'personenkontext-create-organisation-select' });
          await organisationAutocomplete?.setValue('1133');
          await nextTick();
          await flushPromises();
          vi.mocked(rolleStore.getRollenForPersonenkontextCreation).mockClear();

          // Set the selection directly, without touching the search input, to isolate the selection-changed branch
          const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({
            ref: allowMultipleRollen ? 'rollen-select' : 'rolle-select',
          });
          await rolleAutocomplete?.setValue(allowMultipleRollen ? ['54321'] : '54321');
          await nextTick();
          await flushPromises();

          expect(rolleStore.getRollenForPersonenkontextCreation).toHaveBeenCalledWith(
            expect.objectContaining({
              organisationId: '1133',
              rollenIds: ['54321'],
            }),
          );
        });
      });
    },
  );
});
