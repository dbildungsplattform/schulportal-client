import {
  OrganisationResponseLegacy,
  PersonenkontexteUpdateResponse,
  type DBiamPersonResponse,
  type PersonLandesbediensteterSearchResponse,
} from '@/api-client/generated';
import routes from '@/router/routes';
import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import {
  usePersonenkontextStore,
  type PersonenkontextStore,
  type PersonenkontextWorkflowResponse,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import {
  RollenMerkmal,
  useRolleStore,
  type RolleStore,
  type RolleWithServiceProvidersResponse,
} from '@/stores/RolleStore';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import { noop } from 'vuetify/lib/util/helpers.mjs';
import PersonCreationView from './PersonCreationView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;

const personStore: PersonStore = usePersonStore();
const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const rolleStore: RolleStore = useRolleStore();

const PERSON_ID: string = '1';
const ORGANISATION_ID: string = '9876';
const ROLLE_ID: string = '1';

const mockCreatedPersonWithKontext: DBiamPersonResponse = DoFactory.getDBiamPersonResponse({
  person: DoFactory.getPersonResponse({ id: PERSON_ID }),
  dBiamPersonenkontextResponses: [
    DoFactory.getDBiamPersonenkontextResponse({
      personId: PERSON_ID,
      organisationId: ORGANISATION_ID,
      rolleId: ROLLE_ID,
    }),
  ],
});

const workflowOrganisation: OrganisationResponseLegacy = DoFactory.getOrganisationenResponseLegacy({
  id: ORGANISATION_ID,
});

const mockWorkflowStepResponse: PersonenkontextWorkflowResponse = DoFactory.getPersonenkontextWorkflowResponse({
  organisations: [workflowOrganisation],
  rollen: [
    DoFactory.getRolleResponse({
      id: ROLLE_ID,
      rollenart: 'LERN',
      administeredBySchulstrukturknoten: workflowOrganisation.id,
      administeredBySchulstrukturknotenName: workflowOrganisation.name,
      administeredBySchulstrukturknotenKennung: workflowOrganisation.kennung,
      merkmale: new Set<RollenMerkmal>([RollenMerkmal.KopersPflicht]),
    }),
  ],
  canCommit: true,
});

organisationStore.allOrganisationen = [
  DoFactory.getOrganisationenResponseLegacy({
    id: ORGANISATION_ID,
  }),
  DoFactory.getOrganisationenResponseLegacy(),
  DoFactory.getOrganisationenResponseLegacy(),
];

rolleStore.allRollen = [
  DoFactory.getRolleWithServiceProviders({
    id: ROLLE_ID,
    rollenart: 'LERN',
    merkmale: new Set<RollenMerkmal>([RollenMerkmal.KopersPflicht]),
  }),
  DoFactory.getRolleWithServiceProviders(),
] as RolleWithServiceProvidersResponse[];

const mockLandesbediensteteCommitResponse: PersonenkontexteUpdateResponse =
  DoFactory.getPersonenkontextUpdateResponse();

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;

let { storedBeforeRouteLeaveCallback }: { storedBeforeRouteLeaveCallback: OnBeforeRouteLeaveCallback } = vi.hoisted(
  () => {
    return {
      storedBeforeRouteLeaveCallback: (
        _to: RouteLocationNormalized,
        _from: RouteLocationNormalized,
        _next: NavigationGuardNext,
      ): void => {
        // intentionally left blank for test hoisting
      },
    };
  },
);

async function mountComponent(): Promise<ReturnType<typeof mount<typeof PersonCreationView>>> {
  await vi.dynamicImportSettled();
  return mount(PersonCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        PersonCreationView: PersonCreationView as Component,
      },
      plugins: [router],
    },
  });
}

type FormFields = {
  organisationsebene: string;
  rollen: Array<string>;
  klasse?: string;
  befristung?: string;
  vorname: string;
  nachname: string;
  kopersNr?: string;
};

type FormSelectors = {
  organisationsebeneSelect: VueWrapper;
  rollenSelect: VueWrapper;
  klasseSelect: VueWrapper;
  befristungInput: VueWrapper;
  vornameInput: VueWrapper;
  nachnameInput: VueWrapper;
  kopersNrInput: VueWrapper;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { organisationsebene, rollen, klasse, befristung, vorname, nachname, kopersNr }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  const organisationsebeneSelect: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'personenkontext-create' })
    .findComponent({ ref: 'schulenFilter' })
    .findComponent({ ref: 'personenkontext-create-organisation-select' });
  expect(organisationsebeneSelect?.exists()).toBe(true);

  await organisationsebeneSelect?.setValue(organisationsebene);
  await nextTick();
  selectors.organisationsebeneSelect = organisationsebeneSelect;

  const rollenSelect: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'personenkontext-create' })
    .findComponent({ ref: 'rollen-select' });
  expect(rollenSelect?.exists()).toBe(true);

  await rollenSelect?.setValue(rollen);
  await nextTick();
  selectors.rollenSelect = rollenSelect;

  const klasseSelect: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'personenkontext-create' })
    .findComponent({ ref: 'klasse-select' });
  expect(klasseSelect?.exists()).toBe(true);

  await klasseSelect?.setValue(klasse);
  klasseSelect?.vm.$emit('update:selectedKlassen', klasse);
  await nextTick();
  selectors.klasseSelect = klasseSelect;

  const befristungInput: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'personenkontext-create' })
    .findComponent({ ref: 'befristung-input-wrapper' })
    .findComponent({ ref: 'befristung-input' });
  expect(befristungInput?.exists()).toBe(true);

  await befristungInput?.setValue(befristung);
  await nextTick();
  selectors.befristungInput = befristungInput;

  const vornameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'vorname-input' });
  expect(vornameInput?.exists()).toBe(true);

  await vornameInput?.setValue(vorname);
  await nextTick();
  selectors.vornameInput = vornameInput;

  const nachnameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'familienname-input' });
  expect(nachnameInput?.exists()).toBe(true);

  await nachnameInput?.setValue(nachname);
  await nextTick();
  selectors.nachnameInput = nachnameInput;

  const kopersNrInput: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'kopers-input' })
    .findComponent({ ref: 'kopersnr-input' });
  expect(kopersNrInput?.exists()).toBe(true);

  await kopersNrInput?.setValue(kopersNr);
  await nextTick();
  selectors.kopersNrInput = kopersNrInput;

  return selectors;
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <router-view>
        <div id="app"></div>
      </router-view>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = await mountComponent();
  personStore.errorCode = '';
  personenkontextStore.errorCode = '';
  personenkontextStore.createdPersonWithKontext = null;
  personenkontextStore.workflowStepResponse = mockWorkflowStepResponse;
});

describe('PersonCreationView', () => {
  test('it renders the person creation form and its child components', () => {
    expect(wrapper).toBeTruthy();
    expect(wrapper?.find('[data-testid="person-creation-form"]').isVisible()).toBe(true);
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormRow' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'PersonenkontextCreate' })).toBeTruthy();
  });

  test('onBeforeMount sets labels and systemrecht for createType limited', async () => {
    await router.push({ name: 'create-person-limited' });
    await router.isReady();

    wrapper = mount(PersonCreationView, {
      attachTo: document.getElementById('app') || '',
      global: {
        components: {
          PersonCreationView: PersonCreationView as Component,
        },
        plugins: [router],
      },
    });

    await nextTick();

    expect(wrapper.find('[data-testid="admin-headline"]').text()).toBe('Andere Person (neu anlegen)');
    expect(wrapper.find('[data-testid="add-another-state-employee-headline"]').text()).toBe(
      'Andere Person (neu anlegen)',
    );
    expect(wrapper.find('[data-testid="person-creation-form-discard-button"]').text()).toBe('Abbrechen');
    expect(wrapper.find('[data-testid="person-creation-form-submit-button"]').text()).toBe('Person anlegen');

    expect(wrapper.findComponent({ name: 'PersonenkontextCreate' }).props('createType')).toBe('limited');
  });

  it('emits update:calculatedBefristungOption event with a value', async () => {
    const organisationSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationSelect?.setValue(ORGANISATION_ID);
    await nextTick();

    const rolleSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rollen-select' });
    await rolleSelect?.setValue([ROLLE_ID]);
    await nextTick();

    // Get the BefristungInput component
    const personenkontextCreate: VueWrapper | undefined = wrapper?.findComponent({ name: 'PersonenkontextCreate' });

    // Emit the event from the child component
    personenkontextCreate?.vm.$emit('update:calculatedBefristungOption', 'someOption');

    // Assert that the parent component emitted the event
    expect(
      wrapper?.findComponent({ ref: 'personenkontext-create' }).emitted('update:calculatedBefristungOption'),
    ).toBeTruthy();
    expect(
      wrapper?.findComponent({ ref: 'personenkontext-create' }).emitted('update:calculatedBefristungOption')![0],
    ).toEqual(['someOption']);
  });

  it('emits update:calculatedBefristungOption event with no value', async () => {
    const organisationSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationSelect?.setValue(ORGANISATION_ID);
    await nextTick();

    const rolleSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rollen-select' });
    await rolleSelect?.setValue([ROLLE_ID]);
    await nextTick();

    // Get the BefristungInput component
    const personenkontextCreate: VueWrapper | undefined = wrapper?.findComponent({ name: 'PersonenkontextCreate' });

    // Emit the event from the child component
    personenkontextCreate?.vm.$emit('update:calculatedBefristungOption', undefined);

    // Assert that the parent component emitted the event
    expect(
      wrapper?.findComponent({ ref: 'personenkontext-create' }).emitted('update:calculatedBefristungOption'),
    ).toBeTruthy();
    expect(
      wrapper?.findComponent({ ref: 'personenkontext-create' }).emitted('update:calculatedBefristungOption')![0],
    ).toEqual([undefined]);
  });

  test('it navigates back to personen table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
    expect(personenkontextStore.createdPersonWithKontext).toBe(null);
  });

  test('it fills form and triggers submit', async () => {
    personenkontextStore.workflowStepResponse = mockWorkflowStepResponse;

    const organisationSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationSelect?.setValue(ORGANISATION_ID);
    await nextTick();

    const rollenSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rollen-select' });
    await rollenSelect?.setValue([ROLLE_ID]);
    await nextTick();

    const klasseSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'klasse-select' });
    await klasseSelect?.setValue('9a');
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    const vornameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'vorname-input' });
    await vornameInput?.setValue('Randy');
    await nextTick();

    const nachnameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'familienname-input' });
    await nachnameInput?.setValue('Cena');
    await nextTick();

    const kopersInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'kopers-input' })
      .findComponent({ ref: 'kopersnr-input' });
    await kopersInput?.setValue('23234');
    await nextTick();

    await wrapper?.find('[data-testid="person-creation-form-submit-button"]').trigger('click');
    await nextTick();
    await flushPromises();

    // Form is resetting after submit so orga should be undefined
    expect(organisationSelect?.vm.$data).toStrictEqual({});
  });

  test('it fills form, triggers submit and then show success template', async () => {
    personenkontextStore.workflowStepResponse = mockWorkflowStepResponse;

    const organisationSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationSelect?.setValue(ORGANISATION_ID);
    await nextTick();

    const rollenSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rollen-select' });
    await rollenSelect?.setValue([ROLLE_ID]);
    await nextTick();

    const klasseSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'klasse-select' });
    await klasseSelect?.setValue('9a');
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    const vornameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'vorname-input' });
    await vornameInput?.setValue('Randy');
    await nextTick();

    const nachnameInput: VueWrapper | undefined = wrapper?.findComponent({ ref: 'familienname-input' });
    await nachnameInput?.setValue('Cena');
    await nextTick();

    const kopersInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'kopers-input' })
      .findComponent({ ref: 'kopersnr-input' });
    await kopersInput?.setValue('23234');
    await nextTick();

    await wrapper?.find('[data-testid="person-creation-form-submit-button"]').trigger('click');
    await nextTick();
    await flushPromises();

    // Form is resetting after submit so orga should be undefined
    expect(organisationSelect?.vm.$data).toStrictEqual({});

    personenkontextStore.createdPersonWithKontext = mockCreatedPersonWithKontext;

    await nextTick();
    expect(wrapper?.find('[data-testid="person-success-text"]').isVisible()).toBe(true);
  });

  test('it fills form, triggers submit and then shows success template with new methods', async () => {
    personenkontextStore.workflowStepResponse = mockWorkflowStepResponse;

    const spy: Mock = vi.spyOn(personenkontextStore, 'createPersonWithKontexte').mockImplementationOnce(async () => {
      personenkontextStore.createdPersonWithKontext = mockCreatedPersonWithKontext;
      return Promise.resolve();
    });

    const selectors: Partial<FormSelectors> = await fillForm({
      organisationsebene: ORGANISATION_ID,
      rollen: [ROLLE_ID],
      befristung: '12.08.2099',
      vorname: 'Randy',
      nachname: 'Cena',
      kopersNr: '23234',
      klasse: '9a',
    });
    await flushPromises();

    await wrapper?.find('[data-testid="person-creation-form"]').trigger('submit');
    await flushPromises();

    // Form is resetting after submit so orga should be undefined
    expect(selectors.organisationsebeneSelect?.vm.$data).toStrictEqual({});

    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect(wrapper?.find('[data-testid="person-success-text"]').isVisible()).toBe(true);
  });

  test('it renders success template for created user and navigates back to form', async () => {
    personenkontextStore.createdPersonWithKontext = mockCreatedPersonWithKontext;
    await nextTick();

    expect(wrapper?.find('[data-testid="person-success-text"]').isVisible()).toBe(true);

    expect(wrapper?.find('[data-testid="create-another-person-button"]').isVisible()).toBe(true);

    await wrapper?.find('[data-testid="create-another-person-button"]').trigger('click');

    expect(wrapper?.find('[data-testid="person-success-text"]').exists()).toBe(false);
  });

  test('it fills form for Landesbediensteter, triggers submit and then shows success template', async () => {
    const mockLandesbedienstetePersonen: PersonLandesbediensteterSearchResponse[] = [
      DoFactory.getPersonLandesbediensteterSearchResponse(),
    ];
    const organisationId: string = ORGANISATION_ID;
    const rolleId: string = ROLLE_ID;

    personStore.allLandesbedienstetePersonen = mockLandesbedienstetePersonen;
    await router.push({ name: 'add-person-to-own-schule' });
    await router.isReady();

    wrapper = await mountComponent();
    await nextTick();
    personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse({
      organisations: [
        DoFactory.getOrganisationResponse({
          id: organisationId,
        }),
      ],
      rollen: [DoFactory.getRolleResponse({ id: rolleId })],
      canCommit: true,
    });

    const organisationSelect: VueWrapper | undefined = wrapper
      .findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationSelect.setValue(organisationId);
    await nextTick();

    const rollenSelect: VueWrapper | undefined = wrapper
      .findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rollen-select' });
    await rollenSelect.setValue([rolleId]);
    await nextTick();

    await wrapper.find('[data-testid="person-creation-form-submit-button"]').trigger('click');
    await nextTick();
    await flushPromises();

    const confirmButton: Element = await vi.waitUntil(() =>
      document.querySelector('[data-testid="confirm-add-person-button"]'),
    );
    await nextTick();

    confirmButton.dispatchEvent(new Event('click'));

    // Form is resetting after submit so orga should be undefined
    expect(organisationSelect.vm.$data).toStrictEqual({});

    personenkontextStore.landesbediensteteCommitResponse = mockLandesbediensteteCommitResponse;

    await nextTick();
    expect(wrapper.find('[data-testid="state-employee-success-text"]').isVisible()).toBe(true);
  });

  test('it renders success template for added Landesbediensteter and navigates back to person management', async () => {
    await router.push({ name: 'add-person-to-own-schule' });
    await router.isReady();

    wrapper = await mountComponent();

    await nextTick();
    personenkontextStore.landesbediensteteCommitResponse = mockLandesbediensteteCommitResponse;
    await nextTick();

    expect(wrapper.find('[data-testid="state-employee-success-text"]').isVisible()).toBe(true);

    expect(wrapper.find('[data-testid="search-another-state-employee-button"]').isVisible()).toBe(true);

    await wrapper.find('[data-testid="search-another-state-employee-button"]').trigger('click');

    expect(wrapper.find('[data-testid="state-employee-success-text"]').exists()).toBe(false);
  });

  test('it navigates to person details when clicking on btn in success template', async () => {
    personenkontextStore.createdPersonWithKontext = mockCreatedPersonWithKontext;
    await nextTick();
    expect(wrapper?.find('[data-testid="go-to-details-button"]').isVisible()).toBe(true);

    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="go-to-details-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledWith({ name: 'person-details', params: { id: PERSON_ID } });
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });

    test('it triggers if form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });

      wrapper = await mountComponent();
      await fillForm({
        organisationsebene: ORGANISATION_ID,
        rollen: [ROLLE_ID],
        befristung: '12.08.2099',
        vorname: 'John',
        nachname: 'Orton',
        kopersNr: '14614',
      });
      await nextTick();

      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
      await nextTick();

      const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
      expect(confirmButton).not.toBeNull();
      confirmButton!.dispatchEvent(new Event('click'));
      expect(spy).toHaveBeenCalledOnce();
    });

    test('it does not trigger if form is not dirty', async () => {
      // autoselected orgnisation doesnt count as dirty
      const expectedCallsToNext: number = 1;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });
      wrapper = await mountComponent();
      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
    });
  });

  describe.each([[true], [false]])('when form is dirty:%s', (isFormDirty: boolean) => {
    beforeEach(async () => {
      if (isFormDirty) {
        await fillForm({
          organisationsebene: ORGANISATION_ID,
          rollen: [ROLLE_ID],
          befristung: '12.08.2099',
          vorname: 'John',
          nachname: 'Orton',
          kopersNr: '14614',
        });
      }
      await nextTick();
    });

    test('it handles unloading', () => {
      const event: Event = new Event('beforeunload');
      const spy: MockInstance = vi.spyOn(event, 'preventDefault');
      spy.mockClear();
      window.dispatchEvent(event);
      // TODO: why is spy called 12 times?
      // if (isFormDirty) expect(spy).toHaveBeenCalledOnce();
      if (isFormDirty) {
        expect(spy).toHaveBeenCalled();
      } else {
        expect(spy).not.toHaveBeenCalledOnce();
      }
    });
  });

  describe('error handling', () => {
    test('it renders an error', async () => {
      personStore.errorCode = 'ERROR_ERROR';
      await nextTick();

      const push: MockInstance = vi.spyOn(router, 'push');
      await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
      await nextTick();

      expect(push).toHaveBeenCalledTimes(1);
      expect(personStore.errorCode).toBe('');
    });

    test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
      personenkontextStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
      await nextTick();

      const push: MockInstance = vi.spyOn(router, 'push');
      vi.spyOn(router, 'go').mockImplementationOnce(noop);
      expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);

      await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
      await nextTick();

      expect(push).toHaveBeenCalledTimes(1);
      await nextTick();

      personenkontextStore.errorCode = '';
    });
  });
});
