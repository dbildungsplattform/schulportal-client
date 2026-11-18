import { DOMWrapper, enableAutoUnmount, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick } from 'vue';
import { VDialog } from 'vuetify/components';
import { createRouter, createWebHistory, RouterView, type Router } from 'vue-router';

import { EmailAddressStatus, ServiceProviderSystem, type OrganisationResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore, type PersonenkontextRolleFields, type UserInfo } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { usePersonStore, type Personendatensatz, type PersonStore } from '@/stores/PersonStore';
import { RollenArt, RollenMerkmal, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import {
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import { adjustDateForTimezoneAndFormat } from '@/utils/date';
import { parseUserLock, PersonLockOccasion, type UserLock } from '@/utils/lock';
import { DoFactory } from 'test/DoFactory';
import PersonDetailsView from './PersonDetailsView.vue';

type PersonDetailsViewInternals = { changePersonMetadataSuccessVisible: boolean };

type PersonDetailsWrapper = VueWrapper<InstanceType<typeof PersonDetailsView>>;

type PersonDetailsSetup = {
  authStore: AuthStore;
  configStore: ConfigStore;
  organisationStore: OrganisationStore;
  personStore: PersonStore;
  personenkontextStore: PersonenkontextStore;
  twoFactorAuthenticationStore: TwoFactorAuthentificationStore;
  rolleStore: RolleStore;
  serviceProviderStore: ServiceProviderStore;
  mockPerson: Personendatensatz;
  mockPersonenuebersicht: PersonenUebersicht;
  mockPersonenuebersichtLehr: PersonenUebersicht;
  mockCurrentUser: UserInfo;
  mockOrganisation: OrganisationResponse;
  befristung: string;
  router: Router;
  wrapper: PersonDetailsWrapper;
  setCurrentPerson: (emailStatus: EmailAddressStatus) => void;
};

describe('PersonDetailsView', () => {
  enableAutoUnmount(afterEach);

  const setup = async (options: { routerView?: boolean } = {}): Promise<PersonDetailsSetup> => {
    const authStore: AuthStore = useAuthStore();
    const configStore: ConfigStore = useConfigStore();
    const organisationStore: OrganisationStore = useOrganisationStore();
    const personStore: PersonStore = usePersonStore();
    const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
    const twoFactorAuthenticationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
    const rolleStore: RolleStore = useRolleStore();
    const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

    authStore.$reset();
    organisationStore.$reset();
    personStore.$reset();
    personenkontextStore.$reset();
    twoFactorAuthenticationStore.$reset();
    configStore.$reset();
    rolleStore.$reset();
    serviceProviderStore.$reset();

    const mockPerson: Personendatensatz = { person: DoFactory.getPerson() };
    const mockCurrentUser: UserInfo = {
      ...DoFactory.getUserinfoResponse(),
      personId: '2',
      email: 'albert@test.de',
      email_verified: true,
      family_name: 'Test',
      given_name: 'Albert',
      name: 'Albert Test',
      preferred_username: 'albert',
      sub: 'c71be903-d0ec-4207-b653-40c114680b63',
      personenkontexte: [
        {
          organisation: DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Root }),
          rolle: {
            systemrechte: ['ROLLEN_VERWALTEN', 'SCHULEN_VERWALTEN'],
            serviceProviderIds: ['789897798'],
          },
        },
      ],
      password_updated_at: null,
    };
    const befristung: string = '2099-08-12T13:03:53.802Z';
    const mockPersonenuebersicht: PersonenUebersicht = DoFactory.getPersonenUebersicht(
      DoFactory.getPerson({
        id: '1',
        name: { vorname: 'John', familienname: 'Orton' },
        username: 'jorton',
      }),
      [
        DoFactory.getZuordnung({
          sskId: '1',
          rolleId: '1',
          sskName: 'Testschule Birmingham',
          sskDstNr: '123456',
          rolle: 'SuS',
          rollenArt: RollenArt.Lern,
          typ: OrganisationsTyp.Schule,
          administriertVon: '2',
          editable: true,
          befristung,
          admins: ['test'],
        }),
        DoFactory.getZuordnung({
          sskId: '4',
          rolleId: '1',
          rolle: 'SuS',
          rollenArt: RollenArt.Lern,
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
          editable: true,
          befristung,
          admins: ['test'],
        }),
        DoFactory.getZuordnung({
          sskId: '3',
          rolleId: '4',
          sskName: 'Testschule London',
          sskDstNr: '123459',
          rolle: 'SuS',
          rollenArt: RollenArt.Lern,
          typ: OrganisationsTyp.Schule,
          editable: true,
          befristung: null,
          admins: ['test'],
        }),
        DoFactory.getZuordnung({
          sskId: '2',
          rolleId: '1',
          sskName: '9a',
          sskDstNr: '123459',
          rolle: 'SuS',
          rollenArt: RollenArt.Lern,
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
          editable: true,
          befristung: null,
          admins: ['test'],
        }),
      ],
    );
    const mockPersonenuebersichtLehr: PersonenUebersicht = new PersonenUebersicht(
      '22',
      'Randy',
      'Cena',
      'rcena',
      Date.now().toLocaleString(),
      [
        DoFactory.getZuordnung({
          sskId: '1',
          rolleId: '1',
          sskName: 'Testschule Birmingham',
          sskDstNr: '123456',
          rolle: 'Lehrkraft',
          rollenArt: RollenArt.Lehr,
          typ: OrganisationsTyp.Schule,
          administriertVon: '2',
          editable: true,
          merkmale: [],
          befristung,
          admins: [],
        }),
      ],
    );
    const mockOrganisation: OrganisationResponse = DoFactory.getOrganisationResponse({
      id: 'O1',
      typ: OrganisationsTyp.Schule,
    });

    rolleStore.rollenForPersonenkontextCreation = [
      {
        value: '54321',
        title: 'Lehrkraft',
        merkmale: [RollenMerkmal.KopersPflicht],
        rollenart: RollenArt.Lehr,
      },
      {
        value: '1',
        title: 'SuS',
        merkmale: [RollenMerkmal.BefristungPflicht],
        rollenart: RollenArt.Lern,
      },
    ];

    personenkontextStore.workflowStepResponse = {
      organisations: [mockOrganisation],
      selectedOrganisation: 'string',
      selectedRollen: ['string'],
      canCommit: true,
    };

    organisationStore.getParentOrganisationsByIds = (_organisationIds: string[]): Promise<void> => {
      return Promise.resolve();
    };

    organisationStore.parentOrganisationen = [
      {
        id: '123456',
        name: 'Testschule Birmingham',
        typ: OrganisationsTyp.Schule,
        administriertVon: '1',
      },
      {
        id: '123459',
        name: 'Testschule London',
        typ: OrganisationsTyp.Schule,
        administriertVon: '1',
      },
      ...(mockCurrentUser.personenkontexte?.map((pk: PersonenkontextRolleFields) => ({
        id: pk.organisation.id,
        name: pk.organisation.name,
        typ: pk.organisation.typ,
        administriertVon: pk.organisation.administriertVon,
      })) ?? []),
    ];

    authStore.currentUser = { ...mockCurrentUser };
    personStore.currentPerson = { ...mockPerson };
    personStore.personenuebersicht = mockPersonenuebersicht;

    configStore.configData = {
      befristungBearbeitenEnabled: true,
      rolleBearbeitenEnabled: true,
      rolleErweiternEnabled: true,
      setUemPasswordEnabled: true,
      schulischeAngeboteErstellen: true,
    };

    document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

    const router: Router = createRouter({
      history: createWebHistory(),
      routes,
    });

    await router.push(options.routerView ? { name: 'person-details', params: { id: '1' } } : '/');
    await router.isReady();

    const mountView = async (): Promise<PersonDetailsWrapper> => {
      if (!options.routerView) {
        return mount(PersonDetailsView, {
          attachTo: document.getElementById('app') || '',
          global: { plugins: [router] },
        });
      }
      const routerWrapper: VueWrapper = mount(RouterView, {
        attachTo: document.getElementById('app') || '',
        global: { plugins: [router] },
      });
      await flushPromises();
      return routerWrapper.findComponent(PersonDetailsView);
    };
    const wrapper: PersonDetailsWrapper = await mountView();
    await flushPromises();
    const setCurrentPerson = (emailStatus: EmailAddressStatus): void => {
      personStore.currentPerson = {
        person: {
          id: '123456',
          name: {
            familienname: 'Vimes',
            vorname: 'Susan',
          },
          username: '6978',
          personalnummer: '9183756',
          isLocked: false,
          userLock: [],
          revision: '1',
          lastModified: '2024-12-22T13:03:53.802Z',
          email: {
            address: 'test@example.com',
            status: emailStatus,
          },
        },
      };
    };

    return {
      authStore,
      configStore,
      organisationStore,
      personStore,
      personenkontextStore,
      twoFactorAuthenticationStore,
      rolleStore,
      serviceProviderStore,
      mockPerson,
      mockPersonenuebersicht,
      mockPersonenuebersichtLehr,
      mockCurrentUser,
      mockOrganisation,
      befristung,
      router,
      wrapper,
      setCurrentPerson,
    };
  };

  test('it renders the person details page and shows person data', async () => {
    const { wrapper, mockPerson, befristung }: Awaited<ReturnType<typeof setup>> = await setup();
    expect(wrapper).toBeTruthy();
    expect(wrapper?.find('[data-testid="person-details-headline"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="person-vorname"]').text()).toBe(mockPerson.person.name.vorname);
    expect(wrapper?.find('[data-testid="person-familienname"]').text()).toBe(mockPerson.person.name.familienname);
    expect(wrapper?.find('[data-testid="person-username"]').text()).toBe(mockPerson.person.username);
    expect(wrapper?.find('[data-testid="person-email"]').text()).toBe(mockPerson.person.email?.address);
    expect(wrapper?.find('[data-testid="person-zuordnung-1"]').text()).toBe(
      `123456 (Testschule Birmingham): SuS 9a  (befristet bis ${adjustDateForTimezoneAndFormat(befristung)})`,
    );
    expect(wrapper?.getComponent({ name: 'PasswordReset' })).toBeTruthy();
  });

  test('it renders details for a locked person', async () => {
    const { wrapper, personStore }: Awaited<ReturnType<typeof setup>> = await setup();
    const date: string = '01.01.2024';
    const datetime: string = `${date} 12:34:00`;
    const userLock: UserLock[] = [
      {
        personId: '1234',
        locked_by: 'test',
        created_at: datetime,
        lock_occasion: PersonLockOccasion.MANUELL_GESPERRT,
        locked_until: datetime,
      },
    ];

    // Mock the current person in the store
    personStore.currentPerson = {
      person: {
        id: '1234',
        name: {
          familienname: 'Vimes',
          vorname: 'Samuel',
        },
        username: '6978',
        personalnummer: '9183756',
        isLocked: true,
        userLock,
        revision: '1',
        lastModified: '2024-12-22',
        email: {
          address: 'email',
          status: EmailAddressStatus.Requested,
        },
      },
    };
    await nextTick();

    const vornameElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-vorname"]');
    const lockInfoContainer: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-lock-info"]');

    // Check if the element exists and has the correct text content
    expect(vornameElement?.text()).toBe('Samuel');
    expect(lockInfoContainer?.html()).toContain(userLock[0]!.locked_by);
    expect(lockInfoContainer?.html()).toContain(date);
  });

  test('it navigates back to user table', async () => {
    const { router, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await flushPromises();
    expect(push).toHaveBeenCalledTimes(1);
  });

  describe('error handling', () => {
    test('it shows an error if error code exists', async () => {
      const { personStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
      personStore.errorCode = 'ERROR_LOADING_USER';
      await nextTick();

      expect(wrapper?.find('[data-testid$="alert-title"]').text()).toBe('Fehler beim Laden des Benutzers');

      personStore.errorCode = '';
      await nextTick();
    });

    test('it shows correct alert depending on error code', async () => {
      const { personStore, personenkontextStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
      personStore.errorCode = '';
      personenkontextStore.errorCode = 'PERSON_NOT_FOUND';
      await nextTick();

      const alertButton: DOMWrapper<Element> | undefined = wrapper
        ?.findComponent({ ref: 'personenkontext-store-error-alert' })
        .find('[data-testid$="alert-button"]');

      expect(alertButton?.text()).toBe('Zurück zur Ergebnisliste');

      personenkontextStore.errorCode = 'SOME_OTHER_CODE';
      await nextTick();

      expect(alertButton?.text()).toBe('Daten aktualisieren');

      personenkontextStore.errorCode = '';
      personStore.errorCode = 'NEWER_VERSION_OF_PERSON_AVAILABLE';
      await nextTick();

      expect(alertButton?.text()).toBe('Daten aktualisieren');

      personenkontextStore.errorCode = '';
      personStore.errorCode = '';
      await nextTick();
    });
  });

  test('it displays lockInfo if there is any', async () => {
    const { personStore, wrapper, organisationStore }: Awaited<ReturnType<typeof setup>> = await setup();
    expect(personStore.currentPerson).toBeDefined();
    expect(wrapper).toBeDefined();
    personStore.currentPerson!.person.userLock = [];
    await nextTick();

    const activeStatusMessage: DOMWrapper<HTMLDivElement> = wrapper.find('[data-testid="person-lock-info"]');
    expect(activeStatusMessage.exists()).toBe(true);
    expect(activeStatusMessage.text()).toContain('aktiv');
    expect(wrapper.find('[data-testid="lock-info-0-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="lock-info-0-attribute"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="lock-info-1-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="lock-info-1-attribute"]').exists()).toBe(false);

    const date: string = new Date().toUTCString();
    const formattedDate: string = new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const userLock: UserLock[] = [
      {
        personId: '1234',
        locked_by: 'Lady Lock',
        created_at: date,
        lock_occasion: PersonLockOccasion.MANUELL_GESPERRT,
        locked_until: date,
      },
    ];

    personStore.currentPerson!.person.isLocked = true;
    personStore.currentPerson!.person.userLock = parseUserLock(userLock);
    organisationStore.lockingOrganisation = {
      id: '1234',
      name: userLock[0]!.locked_by,
      typ: OrganisationsTyp.Schule,
    };
    await nextTick();

    const lockInfoArray: Array<[string, string]> = [
      ['Gesperrt durch:', userLock[0]!.locked_by],
      ['Gesperrt seit:', formattedDate],
    ];

    for (let index: number = 0; index < lockInfoArray.length; index++) {
      const [keyValue, attributeValue]: [string, string] = lockInfoArray[index]!;
      const keyElement: DOMWrapper<HTMLSpanElement> = wrapper.find(`[data-testid="lock-info-${index}-key"]`);
      const attributeElement: DOMWrapper<HTMLSpanElement> = wrapper.find(
        `[data-testid="lock-info-${index}-attribute"]`,
      );
      expect(keyElement.exists()).toBe(true);
      expect(keyElement.text()).toContain(keyValue);
      expect(attributeElement.text()).toContain(attributeValue);
    }
  });

  it('displays correct email status for Enabled', async () => {
    const { setCurrentPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    setCurrentPerson(EmailAddressStatus.Enabled);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('test@example.com');
  });

  it('displays correct email status for requested', async () => {
    const { setCurrentPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    setCurrentPerson(EmailAddressStatus.Requested);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('wird erzeugt');
  });

  it('displays correct email status for failed', async () => {
    const { setCurrentPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    setCurrentPerson(EmailAddressStatus.Failed);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('fehlerhaft');
  });

  it('displays correct email status for disabled', async () => {
    const { setCurrentPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    setCurrentPerson(EmailAddressStatus.Disabled);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('deaktiviert');
  });

  it('displays correct email status for unknown', async () => {
    const { setCurrentPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    setCurrentPerson('UnknownStatus' as EmailAddressStatus);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.exists()).toBe(false);
  });

  test('it sets errorCode to PERSONALNUMMER_NICHT_EINDEUTIG and goes back to Form', async () => {
    const { personStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    personStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';
    await nextTick();

    await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    const familienNameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-familienname"]');

    expect(familienNameInput?.exists()).toBe(true);
  });

  test('it checks for dirtiness when metadata Form is active', async () => {
    const { wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    await wrapper?.find('[data-testid="metadata-edit-button"]').trigger('click');
    await nextTick();

    await wrapper
      ?.findComponent({ ref: 'person-metadata-change' })
      .findComponent({ ref: 'vorname-input' })
      .setValue('test');
    await nextTick();

    location.reload();

    await nextTick();

    const unsavedChangesDialogButton: VueWrapper | undefined = wrapper?.findComponent({
      ref: 'unsaved-changes-dialog',
    });

    expect(unsavedChangesDialogButton?.exists()).toBe(true);
  });

  test('it cancels metadata form', async () => {
    const { wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    await wrapper?.find('[data-testid="metadata-edit-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="vorname-input"]').isVisible()).toBe(true);

    await wrapper?.find('[data-testid="person-info-edit-cancel"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="metadata-edit-button"]').isVisible()).toBe(true);
  });

  describe('unsaved Zuordnung changes', () => {
    async function selectFirstZuordnung(wrapper: PersonDetailsWrapper): Promise<void> {
      await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
      await wrapper.get('[data-testid="person-zuordnung-1"] input[type="checkbox"]').setValue(true);
      await flushPromises();
    }

    test('it blocks leaving the page while a Zuordnung change is pending', async () => {
      const { wrapper, router }: Awaited<ReturnType<typeof setup>> = await setup({ routerView: true });
      await selectFirstZuordnung(wrapper);
      const personenkontextDelete: VueWrapper = wrapper.findComponent({ name: 'PersonenkontextDelete' });
      personenkontextDelete.vm.$emit('onDeletePersonenkontext');
      await flushPromises();

      void router.push({ name: 'person-management' });
      await flushPromises();

      expect(document.body.querySelector('[data-testid="unsaved-changes-warning-text"]')).not.toBeNull();
      expect(router.currentRoute.value.name).toBe('person-details');
    });

    test('it prevents unloading the page while a Zuordnung form is dirty', async () => {
      const { wrapper }: Awaited<ReturnType<typeof setup>> = await setup({ routerView: true });
      await selectFirstZuordnung(wrapper);
      await wrapper.get('[data-testid="klasse-change-button"]').trigger('click');
      await flushPromises();

      const beforeUnloadEvent: Event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(beforeUnloadEvent);

      expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    });
  });

  describe('without Zuordnungen data', () => {
    test('it does not require a KoPers.-Nr. when no personenuebersicht is loaded', async () => {
      const { personStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
      personStore.personenuebersicht = null;
      await flushPromises();

      expect(wrapper?.find('[data-testid="metadata-edit-button"]').exists()).toBe(true);
    });
  });

  test('it updates the visibility of the dialogs', async () => {
    const { wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    for (const dialog of wrapper.findAllComponents(VDialog)) {
      dialog.vm.$emit('update:modelValue', true);
      dialog.vm.$emit('update:modelValue', false);
    }
    await flushPromises();

    expect(wrapper.findAllComponents(VDialog).length).toBeGreaterThan(0);
  });

  describe('leaving the page', () => {
    test('it navigates away without a warning when nothing was changed', async () => {
      const { router }: Awaited<ReturnType<typeof setup>> = await setup({ routerView: true });

      await router.push({ name: 'person-management' });
      await flushPromises();

      expect(router.currentRoute.value.name).toBe('person-management');
    });
  });

  describe('error messages', () => {
    test('check 2fa connection error', async () => {
      const { twoFactorAuthenticationStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
      twoFactorAuthenticationStore.loading = false;
      twoFactorAuthenticationStore.required = true;
      twoFactorAuthenticationStore.errorCode = 'PI_UNAVAILABLE_ERROR';
      await nextTick();

      expect(wrapper?.find('[data-testid="connection-error-text"]').isVisible()).toBe(true);
    });
    test('check 2fa state error', async () => {
      const { twoFactorAuthenticationStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
      twoFactorAuthenticationStore.loading = false;
      twoFactorAuthenticationStore.required = true;
      twoFactorAuthenticationStore.errorCode = 'TOKEN_STATE_ERROR';
      await nextTick();

      expect(wrapper?.find('[data-testid="token-state-error-text"]').isVisible()).toBe(true);
    });
  });

  describe('two factor authentication info', () => {
    test.each([
      [
        true,
        true,
        'Um einen neuen Token einzurichten, muss der aktuelle Token durch die schulischen Administratorinnen und Administratoren zurückgesetzt werden.',
      ],
      [
        true,
        false,
        'Dieser Benutzer hat keinen Zugriff mehr auf sicherheitskritische Bereiche und benötigt aktuell den eingerichteten Token nicht.',
      ],
      [false, true, 'Für diesen Benutzer ist aktuell keine 2FA eingerichtet.'],
    ])(
      'it shows the matching info when a token is set up: %s and 2FA is required: %s',
      async (hasToken: boolean, required: boolean, text: string) => {
        const { twoFactorAuthenticationStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
        twoFactorAuthenticationStore.loading = false;
        twoFactorAuthenticationStore.hasToken = hasToken;
        twoFactorAuthenticationStore.required = required;
        await nextTick();

        expect(wrapper?.text()).toContain(text);
      },
    );
  });

  test('it marks a missing KoPers.-Nr. of a person with a KoPers.-Rolle', async () => {
    const { personStore, mockPerson, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(undefined, [
      DoFactory.getZuordnung({ merkmale: [RollenMerkmal.KopersPflicht] }),
    ]);
    personStore.currentPerson = { person: { ...mockPerson.person, personalnummer: null } };
    await nextTick();

    expect(wrapper?.find('[data-testid="person-kopersnr"]').text()).toBe('fehlt');
  });

  test('it shows a spinner in the device password section while the person is loading', async () => {
    const { serviceProviderStore, personStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    serviceProviderStore.assignedServiceProviders = [
      DoFactory.getServiceProviderResponse({ externalSystem: ServiceProviderSystem.Uem }),
    ];
    personStore.loading = true;
    await nextTick();

    expect(wrapper?.find('[data-testid="device-password-info"] .v-progress-circular').exists()).toBe(true);
  });

  test('it closes the success dialog after the person metadata were changed', async () => {
    const { wrapper, personStore }: Awaited<ReturnType<typeof setup>> = await setup();
    const vm: unknown = wrapper.vm;
    const internals: PersonDetailsViewInternals = vm as PersonDetailsViewInternals;
    internals.changePersonMetadataSuccessVisible = true;
    await flushPromises();
    const successCard: Element | null | undefined = document.body
      .querySelector('.metadata-success-message')
      ?.closest('.v-card');
    const closeButton: HTMLButtonElement | undefined = Array.from(successCard?.querySelectorAll('button') ?? []).find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Schließen',
    );

    closeButton!.click();
    await flushPromises();

    expect(personStore.getPersonById).toHaveBeenCalled();
    expect(internals.changePersonMetadataSuccessVisible).toBe(false);
  });

  test('it shows loading spinner', async () => {
    const { personStore, wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    personStore.loading = true;
    personStore.currentPerson = null;
    await flushPromises();

    expect(wrapper?.find('[data-testid="loading-spinner"]').isVisible()).toBe(true);
  });

  test('it shows befristung', async () => {
    const { wrapper }: Awaited<ReturnType<typeof setup>> = await setup();
    expect(wrapper?.find('[data-testid="zuordnung-befristung-text"]').isVisible()).toBe(true);
  });

  test('it shows device password template for rollenart lehr', async () => {
    const {
      personStore,
      mockPersonenuebersichtLehr,
      serviceProviderStore,
      setCurrentPerson,
      wrapper,
      mockPersonenuebersicht,
    }: Awaited<ReturnType<typeof setup>> = await setup();
    personStore.personenuebersicht = mockPersonenuebersichtLehr;
    serviceProviderStore.assignedServiceProviders = [
      DoFactory.getServiceProviderResponse({ externalSystem: ServiceProviderSystem.Uem }),
    ];
    setCurrentPerson(EmailAddressStatus.Enabled);
    await nextTick();
    expect(wrapper.find('[data-testid="device-password-info"]').isVisible()).toBe(true);

    const devicePasswordChangeButton: DOMWrapper<Element> = wrapper
      .findComponent({ ref: 'device-password-reset' })
      .find('[data-testid="open-device-password-dialog-button"]');
    devicePasswordChangeButton.trigger('click');
    await nextTick();

    expect(document.querySelector('[data-testid="password-reset-info-text"]')).not.toBeNull();

    const resetPasswordButton: HTMLElement = document.querySelector(
      '[data-testid="password-reset-button"]',
    ) as HTMLElement;

    expect(resetPasswordButton).not.toBeNull();
    resetPasswordButton.click();
    resetPasswordButton.dispatchEvent(new Event('click'));
    await flushPromises();
    await nextTick();

    expect(personStore.resetDevicePassword).toHaveBeenCalled();

    // reset personenuebersicht
    personStore.personenuebersicht = mockPersonenuebersicht;
  });

  test('it shows password reset template', async () => {
    const {
      personStore,
      mockPersonenuebersichtLehr,
      setCurrentPerson,
      wrapper,
      mockPersonenuebersicht,
    }: Awaited<ReturnType<typeof setup>> = await setup();
    personStore.personenuebersicht = mockPersonenuebersichtLehr;
    setCurrentPerson(EmailAddressStatus.Enabled);
    await nextTick();
    const devicePasswordChangeButton: DOMWrapper<Element> | undefined = wrapper
      .findComponent({ ref: 'password-reset' })
      .find('[data-testid="open-password-reset-dialog-button"]');
    devicePasswordChangeButton.trigger('click');
    await flushPromises();

    expect(document.querySelector('[data-testid="password-reset-info-text"]')).not.toBeNull();

    const resetPasswordButton: HTMLElement = document.querySelector(
      '[data-testid="password-reset-button"]',
    ) as HTMLElement;

    expect(resetPasswordButton).not.toBeNull();
    resetPasswordButton.click();
    resetPasswordButton.dispatchEvent(new Event('click'));
    await flushPromises();
    await nextTick();

    expect(personStore.resetPassword).toHaveBeenCalled();
    // reset personenuebersicht
    personStore.personenuebersicht = mockPersonenuebersicht;
  });

  test('it navigates to the Zuordnung creation form and resets the error code when the Personalnummer is not unique', async () => {
    const { wrapper, personenkontextStore }: Awaited<ReturnType<typeof setup>> = await setup();
    await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
    await flushPromises();
    expect(wrapper?.find('[data-testid="zuordnung-creation-form"]').exists()).toBe(false);

    personenkontextStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';
    await nextTick();

    await wrapper
      ?.findComponent({ ref: 'personenkontext-store-error-alert' })
      .find('[data-testid="spsh-alert-button"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper?.find('[data-testid="zuordnung-creation-form"]').exists()).toBe(true);
    expect(personenkontextStore.errorCode).toBe('');
  });

  test('it submits the form to lock the user', async () => {
    const { personStore, wrapper, mockPersonenuebersicht }: Awaited<ReturnType<typeof setup>> = await setup();
    if (personStore.currentPerson) {
      personStore.currentPerson.person.isLocked = false;
      personStore.currentPerson.person.userLock = [];
    }
    const openLockDialogButton: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="open-lock-dialog-button"]',
    );
    openLockDialogButton?.trigger('click');
    await nextTick();

    expect(document.querySelector('[data-testid="lock-user-info-text"]')).not.toBeNull();

    const unbefristetRadioButton: HTMLElement = document.querySelector(
      '[data-testid="unbefristet-radio-button"] input[type="radio"]',
    ) as HTMLElement;

    expect(unbefristetRadioButton).not.toBeNull();
    unbefristetRadioButton.click();
    unbefristetRadioButton.dispatchEvent(new Event('click'));

    const lockUserButton: HTMLElement = document.querySelector('[data-testid="lock-user-button"]') as HTMLElement;

    expect(lockUserButton).not.toBeNull();
    lockUserButton.click();
    lockUserButton.dispatchEvent(new Event('click'));
    await nextTick();
    await flushPromises();
    await flushPromises();

    expect(personStore.lockPerson).toHaveBeenCalled();
    // reset personenuebersicht
    personStore.personenuebersicht = mockPersonenuebersicht;
  });
});
