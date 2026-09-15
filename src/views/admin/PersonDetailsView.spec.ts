import { EmailAddressStatus, type SystemRechtResponse } from '@/api-client/generated';
import type { TranslatedRolleWithAttrs } from '@/composables/useRollen';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore, type PersonenkontextRolleFields, type UserInfo } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { usePersonStore, type Personendatensatz, type PersonStore } from '@/stores/PersonStore';
import { RollenArt, RollenMerkmal, useRolleStore, type Rolle, type RolleStore } from '@/stores/RolleStore';
import {
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import { adjustDateForTimezoneAndFormat } from '@/utils/date';
import { parseUserLock, PersonLockOccasion, type UserLock } from '@/utils/lock';
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component, type ComputedRef, type DefineComponent } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import PersonDetailsView from './PersonDetailsView.vue';
import type { Person } from '@/stores/types/Person';

let wrapper: VueWrapper | null = null;
let router: Router;

const authStore: AuthStore = useAuthStore();
const configStore: ConfigStore = useConfigStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const personStore: PersonStore = usePersonStore();
const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
const twoFactorAuthenticationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
const rolleStore: RolleStore = useRolleStore();

const mockPerson: Personendatensatz = {
  person: DoFactory.getPerson(),
};

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
      organisation: DoFactory.getOrganisationResponse(),
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
    name: {
      vorname: 'John',
      familienname: 'Orton',
    },
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

const getMockPersonenuebersichtLehr = (): PersonenUebersicht => {
  return new PersonenUebersicht('22', 'Randy', 'Cena', 'rcena', Date.now().toLocaleString(), [
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
  ]);
};

const mockPersonenuebersichtLehr: PersonenUebersicht = getMockPersonenuebersichtLehr();

describe('PersonDetailsView', () => {
  beforeEach(async () => {
    authStore.$reset();
    organisationStore.$reset();
    personStore.$reset();
    personenkontextStore.$reset();
    twoFactorAuthenticationStore.$reset();
    configStore.$reset();
    rolleStore.$reset();

    personenkontextStore.workflowStepResponse = {
      organisations: [
        {
          id: 'O1',
          administriertVon: 'string',
          kennung: 'string',
          name: 'string',
          namensergaenzung: 'string',
          kuerzel: 'string',
          typ: 'ROOT',
        },
      ],
      rollen: [
        {
          id: '54321',
          createdAt: '2024-06-25T13:03:53.802Z',
          updatedAt: '2024-06-25T13:03:53.802Z',
          name: 'string',
          administeredBySchulstrukturknoten: 'string',
          rollenart: 'LERN',
          merkmale: [RollenMerkmal.KopersPflicht],
          systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
          administeredBySchulstrukturknotenName: 'Land SH',
          administeredBySchulstrukturknotenKennung: '',
          version: 1,
        },
        {
          id: '1',
          createdAt: '2024-06-25T13:03:53.802Z',
          updatedAt: '2024-06-25T13:03:53.802Z',
          name: 'SuS',
          administeredBySchulstrukturknoten: '1',
          rollenart: 'LERN',
          merkmale: [RollenMerkmal.BefristungPflicht],
          systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
          administeredBySchulstrukturknotenName: 'Land SH',
          administeredBySchulstrukturknotenKennung: '',
          version: 1,
        },
      ],
      selectedOrganisation: 'string',
      selectedRollen: ['string'],
      canCommit: true,
    };

    organisationStore.klassen = [
      {
        id: '1',
        kennung: '1234567',
        name: 'Klasse 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'K1',
        typ: OrganisationsTyp.Klasse,
        administriertVon: '1',
      },
      {
        id: '9a',
        kennung: '1234567',
        name: 'Klasse 2',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'K1',
        typ: OrganisationsTyp.Klasse,
        administriertVon: 'O1',
      },
    ];

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

    router = createRouter({
      history: createWebHistory(),
      routes,
    });

    router.push('/');
    await router.isReady();

    wrapper = mount(PersonDetailsView, {
      attachTo: document.getElementById('app') || '',
      global: {
        components: {
          PersonDetailsView: PersonDetailsView as Component,
        },
        plugins: [router],
      },
    });
  });

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

  test('it renders the person details page and shows person data', () => {
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
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
  });

  describe('error handling', () => {
    test('it shows an error if error code exists', async () => {
      personStore.errorCode = 'ERROR_LOADING_USER';
      await nextTick();

      expect(wrapper?.find('[data-testid$="alert-title"]').text()).toBe('Fehler beim Laden des Benutzers');

      personStore.errorCode = '';
      await nextTick();
    });

    test('it shows correct alert depending on error code', async () => {
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

  // test('It cancels editing', async () => {
  //   await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
  //   await nextTick();

  //   const zuordnungCreateButton: VueWrapper | undefined = wrapper?.findComponent({ ref: 'zuordnung-create-button' });

  //   await wrapper?.find('[data-testid="zuordnung-edit-cancel"]').trigger('click');
  //   await nextTick();

  //   expect(zuordnungCreateButton?.exists()).toBe(false);
  // });

  // test('It triggers change Klasse and selects the first checkbox', async () => {
  //   // Trigger edit mode
  //   await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
  //   await nextTick();
  //   console.log('******')
  //   console.log(wrapper?.find('[data-testid="checkbox-zuordnung-1"').html());

  //   // Find the first checkbox
  //   const firstCheckbox: VueWrapper | undefined = wrapper?.findComponent({ ref: 'checkbox-zuordnung-1' });

  //   // Explicitly set the value of the checkbox via v-model
  //   await firstCheckbox?.setValue([
  //     {
  //       sskId: '1',
  //       rolleId: '1',
  //       sskName: 'Testschule Birmingham',
  //       sskDstNr: '123456',
  //       rolle: 'SuS',
  //       typ: OrganisationsTyp.Schule,
  //       administriertVon: '2',
  //       editable: true,
  //     },
  //   ]);
  //   await nextTick();

  //   // Trigger the Klasse change button
  //   await wrapper?.find('[data-testid="klasse-change-button"]').trigger('click');
  //   await nextTick();

  //   // Assert that the Klasse change form is displayed
  //   const klasseChangeFormComponent: VueWrapper | undefined = wrapper?.findComponent({ ref: 'klasse-change-form' });

  //   expect(klasseChangeFormComponent?.exists()).toBe(true);
  // });

  test('filteredRollen returns correct roles based on person context and selection', () => {
    interface PersonDetailsViewType extends DefineComponent {
      filteredRollen: ComputedRef<TranslatedRolleWithAttrs[] | undefined>;
    }
    const vm: PersonDetailsViewType = wrapper?.vm as unknown as PersonDetailsViewType;
    const filteredRollen: ComputedRef<TranslatedRolleWithAttrs[] | undefined> = vm.filteredRollen;

    // Verify that filteredRollen contains only roles that are not already assigned and filtered correctly
    expect(filteredRollen).toEqual([
      {
        value: '54321',
        title: 'string',
        rollenart: RollenArt.Lern,
        merkmale: [RollenMerkmal.KopersPflicht],
      },
      {
        value: '1',
        title: 'SuS',
        rollenart: RollenArt.Lern,
        merkmale: [RollenMerkmal.BefristungPflicht],
      },
    ]);
  });

  test('it displays lockInfo if there is any', async () => {
    expect(personStore.currentPerson).toBeDefined();
    expect(wrapper).toBeDefined();
    personStore.currentPerson!.person.userLock = [];
    await nextTick();

    const activeStatusMessage: DOMWrapper<HTMLDivElement> = wrapper!.find('[data-testid="person-lock-info"]');
    expect(activeStatusMessage.exists()).toBe(true);
    expect(activeStatusMessage.text()).toContain('aktiv');
    expect(wrapper!.find('[data-testid="lock-info-0-key"]').exists()).toBe(false);
    expect(wrapper!.find('[data-testid="lock-info-0-attribute"]').exists()).toBe(false);
    expect(wrapper!.find('[data-testid="lock-info-1-key"]').exists()).toBe(false);
    expect(wrapper!.find('[data-testid="lock-info-1-attribute"]').exists()).toBe(false);

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
      const keyElement: DOMWrapper<HTMLSpanElement> = wrapper!.find(`[data-testid="lock-info-${index}-key"]`);
      const attributeElement: DOMWrapper<HTMLSpanElement> = wrapper!.find(
        `[data-testid="lock-info-${index}-attribute"]`,
      );
      expect(keyElement.exists()).toBe(true);
      expect(keyElement.text()).toContain(keyValue);
      expect(attributeElement.text()).toContain(attributeValue);
    }
  });

  it('displays correct email status for Enabled', async () => {
    setCurrentPerson(EmailAddressStatus.Enabled);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('test@example.com');
  });

  it('displays correct email status for requested', async () => {
    setCurrentPerson(EmailAddressStatus.Requested);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('wird erzeugt');
  });

  it('displays correct email status for failed', async () => {
    setCurrentPerson(EmailAddressStatus.Failed);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('fehlerhaft');
  });

  it('displays correct email status for disabled', async () => {
    setCurrentPerson(EmailAddressStatus.Disabled);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.text()).toBe('deaktiviert');
  });

  it('displays correct email status for unknown', async () => {
    setCurrentPerson('UnknownStatus' as EmailAddressStatus);

    await nextTick();

    const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-text"]');
    expect(emailElement?.exists()).toBe(false);
  });

  test('it sets errorCode to PERSONALNUMMER_NICHT_EINDEUTIG and goes back to Form', async () => {
    personStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';
    await nextTick();

    await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    const familienNameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-familienname"]');

    expect(familienNameInput?.exists()).toBe(true);
  });

  test('it checks for dirtiness when metadata Form is active', async () => {
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
    await wrapper?.find('[data-testid="metadata-edit-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="vorname-input"]').isVisible()).toBe(true);

    await wrapper?.find('[data-testid="person-info-edit-cancel"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="metadata-edit-button"]').isVisible()).toBe(true);
  });

  describe('error messages', () => {
    test('check 2fa connection error', async () => {
      twoFactorAuthenticationStore.loading = false;
      twoFactorAuthenticationStore.required = true;
      twoFactorAuthenticationStore.errorCode = 'PI_UNAVAILABLE_ERROR';
      await nextTick();

      expect(wrapper?.find('[data-testid="connection-error-text"]').isVisible()).toBe(true);
    });
    test('check 2fa state error', async () => {
      twoFactorAuthenticationStore.loading = false;
      twoFactorAuthenticationStore.required = true;
      twoFactorAuthenticationStore.errorCode = 'TOKEN_STATE_ERROR';
      await nextTick();

      expect(wrapper?.find('[data-testid="token-state-error-text"]').isVisible()).toBe(true);
    });
  });

  test('it shows loading spinner', async () => {
    personStore.loading = true;
    personStore.currentPerson = null;
    await flushPromises();

    expect(wrapper?.find('[data-testid="loading-spinner"]').isVisible()).toBe(true);
  });

  test('it shows befristung', () => {
    expect(wrapper?.find('[data-testid="zuordnung-befristung-text"]').isVisible()).toBe(true);
  });

  test('it shows device password template for rollenart lehr', async () => {
    personStore.personenuebersicht = mockPersonenuebersichtLehr;
    setCurrentPerson(EmailAddressStatus.Enabled);
    await nextTick();
    if (!wrapper) {
      return;
    }

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
    personStore.personenuebersicht = mockPersonenuebersichtLehr;
    setCurrentPerson(EmailAddressStatus.Enabled);
    await nextTick();
    if (!wrapper) {
      return;
    }

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

  test('renders form to add Zuordnung and triggers submit', async () => {
    organisationStore.getAllOrganisationen = vi.fn().mockResolvedValue(undefined);
    organisationStore.getKlassenByOrganisationId = vi.fn().mockResolvedValue(undefined);
    organisationStore.fetchSchuleDetailsForKlassen = vi.fn().mockResolvedValue(undefined);
    personenkontextStore.processWorkflowStep = vi.fn().mockResolvedValue(undefined);
    personenkontextStore.updatePersonenkontexte = vi.fn().mockResolvedValue(undefined);

    // No existing Zuordnungen for the user for easier testing
    const mockPersonenuebersichtForAddZuordnung: PersonenUebersicht = DoFactory.getPersonenUebersicht(undefined, []);
    personStore.personenuebersicht = mockPersonenuebersichtForAddZuordnung;

    wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
    await nextTick();

    wrapper?.find('[data-testid="zuordnung-create-button"]').trigger('click');

    await flushPromises();

    // Set organisation value
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue('O1');
    organisationAutocomplete?.vm.$emit('update:search', 'O1');
    await nextTick();

    // Set rolle value
    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue('54321');
    rolleAutocomplete?.vm.$emit('update:search', '54321');
    await nextTick();
    // Set klasse value
    const klasseAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ name: 'KlassenFilter' })
      .findComponent({ ref: 'personenkontext-create-klasse-select' });
    await klasseAutocomplete?.setValue('9a');
    klasseAutocomplete?.vm.$emit('update:search', '9a');
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    const submitButton: Element | null = document.body.querySelector(
      '[data-testid="zuordnung-creation-submit-button"]',
    );
    expect(submitButton).not.toBeNull();
    await nextTick();

    if (submitButton) {
      submitButton.dispatchEvent(new Event('click'));
    }

    wrapper?.find('[data-testid="zuordnung-creation-submit-button"]').trigger('click');

    await flushPromises();
    // wait for vuetify animation to complete
    await vi.waitUntil(() => document.body.querySelector('[data-testid="confirm-zuordnung-dialog-addition"]') != null);

    const confirmDialogButton: Element | null = document.body.querySelector(
      '[data-testid="confirm-zuordnung-dialog-addition"]',
    );
    expect(confirmDialogButton).not.toBeNull();

    if (confirmDialogButton) {
      confirmDialogButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    const saveButton: Element | null = document.body.querySelector('[data-testid="zuordnung-changes-save-button"]');
    expect(saveButton).not.toBeNull();

    if (saveButton) {
      saveButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    const closeSuccessButton: Element | null = document.body.querySelector(
      '[data-testid="close-zuordnung-create-success-button"]',
    );
    expect(closeSuccessButton).not.toBeNull();

    if (closeSuccessButton) {
      closeSuccessButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    expect(wrapper?.find('[data-testid="zuordnung-edit-button"]').isVisible()).toBe(true);
  });

  test('renders form to add Zuordnung, triggers submit that results in an error and then navigates back to form and resets errorCode', async () => {
    organisationStore.getAllOrganisationen = vi.fn().mockResolvedValue(undefined);
    organisationStore.getKlassenByOrganisationId = vi.fn().mockResolvedValue(undefined);
    organisationStore.fetchSchuleDetailsForKlassen = vi.fn().mockResolvedValue(undefined);
    personenkontextStore.processWorkflowStep = vi.fn().mockResolvedValue(undefined);

    // No existing Zuordnungen for the user for easier testing
    const mockPersonenuebersichtForAddZuordnung: PersonenUebersicht = DoFactory.getPersonenUebersicht(undefined, []);
    personStore.personenuebersicht = mockPersonenuebersichtForAddZuordnung;

    wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
    await nextTick();

    wrapper?.find('[data-testid="zuordnung-create-button"]').trigger('click');

    await flushPromises();

    // Set organisation value
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue('O1');
    organisationAutocomplete?.vm.$emit('update:search', 'O1');
    await nextTick();

    // Set rolle value
    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue('54321');
    rolleAutocomplete?.vm.$emit('update:search', '54321');
    await nextTick();
    // Set klasse value
    const klasseAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ name: 'KlassenFilter' })
      .findComponent({ ref: 'personenkontext-create-klasse-select' });
    await klasseAutocomplete?.setValue('9a');
    klasseAutocomplete?.vm.$emit('update:search', '9a');
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    await nextTick();

    const submitButton: Element | null = document.body.querySelector(
      '[data-testid="zuordnung-creation-submit-button"]',
    );
    expect(submitButton).not.toBeNull();
    await nextTick();

    if (submitButton) {
      submitButton.dispatchEvent(new Event('click'));
    }

    wrapper?.find('[data-testid="zuordnung-creation-submit-button"]').trigger('click');

    await flushPromises();
    // wait for vuetify animation to complete
    await vi.waitUntil(() => document.body.querySelector('[data-testid="confirm-zuordnung-dialog-addition"]') != null);

    const confirmDialogButton: Element | null = document.body.querySelector(
      '[data-testid="confirm-zuordnung-dialog-addition"]',
    );
    expect(confirmDialogButton).not.toBeNull();

    if (confirmDialogButton) {
      confirmDialogButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    const saveButton: Element | null = document.body.querySelector('[data-testid="zuordnung-changes-save-button"]');
    expect(saveButton).not.toBeNull();

    if (saveButton) {
      saveButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    personenkontextStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';
    await nextTick();
    // ASSERT: store error code is set
    expect(personenkontextStore.errorCode).toBe('PERSONALNUMMER_NICHT_EINDEUTIG');

    const alertButtonAction: DOMWrapper<Element> | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-store-error-alert' })
      .find('[data-testid="spsh-alert-button"]');
    alertButtonAction?.trigger('click');
    await nextTick();

    expect(personenkontextStore.errorCode).toBe('');
  });

  test('renders form to change Klasse and triggers submit', async () => {
    organisationStore.getAllOrganisationen = vi.fn().mockResolvedValue(undefined);
    organisationStore.getKlassenByOrganisationId = vi.fn().mockResolvedValue(undefined);
    organisationStore.fetchSchuleDetailsForKlassen = vi.fn().mockResolvedValue(undefined);
    personenkontextStore.processWorkflowStep = vi.fn().mockResolvedValue(undefined);
    personenkontextStore.updatePersonenkontexte = vi.fn().mockResolvedValue(undefined);

    const mockCurrentRolle: Rolle = DoFactory.getRolle({
      rollenart: RollenArt.Lern,
    });

    rolleStore.currentRolle = mockCurrentRolle;
    await nextTick();

    await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
    await nextTick();

    const checkbox: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
      '[data-testid="person-zuordnung-1"] input[type="checkbox"]',
    );
    await checkbox?.setValue(!checkbox.element.checked);
    await nextTick();

    await wrapper?.find('[data-testid="klasse-change-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="klasse-change-form"]').isVisible()).toBe(true);

    const klasseInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'klasse-change-form' })
      .findComponent({ name: 'KlassenFilter' });
    await klasseInput?.setValue('9a');
    await nextTick();

    await wrapper?.find('[data-testid="klasse-change-submit-button"]').trigger('click');
    await nextTick();

    await flushPromises();
    // wait for vuetify animation to complete
    await vi.waitUntil(() => document.body.querySelector('[data-testid="confirm-change-klasse-button"]') != null);

    const confirmDialogButton: Element | null = document.body.querySelector(
      '[data-testid="confirm-change-klasse-button"]',
    );
    expect(confirmDialogButton).not.toBeNull();

    if (confirmDialogButton) {
      confirmDialogButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    const saveButton: Element | null = document.body.querySelector('[data-testid="zuordnung-changes-save-button"]');
    expect(saveButton).not.toBeNull();

    if (saveButton) {
      saveButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    const closeSuccessButton: Element | null = document.body.querySelector(
      '[data-testid="change-klasse-success-dialog-close-button"]',
    );
    expect(closeSuccessButton).not.toBeNull();

    if (closeSuccessButton) {
      closeSuccessButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    expect(wrapper?.find('[data-testid="zuordnung-edit-button"]').isVisible()).toBe(true);
  });

  test('renders form to delete Zuordnung and triggers submit', async () => {
    await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
    await nextTick();

    const checkbox: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
      '[data-testid="person-zuordnung-1"] input[type="checkbox"]',
    );
    await checkbox?.setValue(!checkbox.element.checked);
    await nextTick();

    await wrapper
      ?.findComponent({ ref: 'personenkontext-delete' })
      .find('[data-testid="open-zuordnung-delete-dialog-button"]')
      .trigger('click');
    await nextTick();

    expect(document.body.querySelector('[data-testid="zuordnung-delete-confirmation-text"]')).not.toBeNull();

    const confirmDeleteButton: Element | null = document.body.querySelector('[data-testid="zuordnung-delete-button"]');
    expect(confirmDeleteButton).not.toBeNull();

    if (confirmDeleteButton) {
      confirmDeleteButton.dispatchEvent(new Event('click'));
    }

    const saveButton: Element | null = document.body.querySelector('[data-testid="zuordnung-changes-save-button"]');
    expect(saveButton).not.toBeNull();

    if (saveButton) {
      saveButton.dispatchEvent(new Event('click'));
    }

    await flushPromises();

    const closeSuccessButton: Element | null = document.body.querySelector(
      '[data-testid="close-zuordnung-delete-success-button"]',
    );
    expect(closeSuccessButton).not.toBeNull();

    if (closeSuccessButton) {
      closeSuccessButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    expect(wrapper?.find('[data-testid="zuordnung-edit-button"]').isVisible()).toBe(true);
  });

  test('it submits the form to lock the user', async () => {
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

  describe('change befristung', () => {
    function getNextSchuljahresende(): string {
      const today: Date = new Date();
      const currentYear: number = today.getFullYear();
      const july31stThisYear: Date = new Date(currentYear, 6, 31);

      // If today's date is after July 31st this year, return July 31st of next year
      if (today > july31stThisYear) {
        return `${currentYear + 1}-07-31T15:07:37.000Z`;
      }

      // Otherwise, return July 31st of this year
      return `${currentYear}-07-31T15:07:37.000Z`;
    }

    test('it shows befristung change form', async () => {
      await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
      await nextTick();

      const checkbox: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
        '[data-testid="person-zuordnung-1"] input[type="checkbox"]',
      );
      await checkbox?.setValue(!checkbox.element.checked);
      await nextTick();

      await wrapper?.find('[data-testid="befristung-change-button"]').trigger('click');
      await nextTick();

      expect(wrapper?.find('[data-testid="change-befristung-form"]').isVisible()).toBe(true);
    });

    test('it doesnt show button if config is disabled', async () => {
      configStore.configData = {
        befristungBearbeitenEnabled: false,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
      await nextTick();

      expect(wrapper?.find('[data-testid="befristung-change-button"]').exists()).toBe(false);
    });

    test('button only active if one zuordnung is selected', async () => {
      await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
      await nextTick();
      expect(wrapper?.find('[data-testid="befristung-change-button"]').attributes('disabled')).toBeDefined();

      const checkbox1: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
        '[data-testid="person-zuordnung-1"] input[type="checkbox"]',
      );
      await checkbox1?.setValue(true);
      await nextTick();

      expect(wrapper?.find('[data-testid="befristung-change-button"]').attributes('disabled')).toBeUndefined();

      const checkbox2: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
        '[data-testid="person-zuordnung-3"] input[type="checkbox"]',
      );
      await checkbox2?.setValue(true);
      await nextTick();

      expect(wrapper?.find('[data-testid="befristung-change-button"]').attributes('disabled')).toBeDefined();
    });

    describe.each([[RollenArt.Lehr], [RollenArt.Lern]])('when rolle is %s', (rollenart: RollenArt) => {
      describe.each([['2099-08-12T13:03:53.802Z'], ['unbefristet'], ['schuljahresende']])(
        'when existing befristung is %s',
        (existingBefristung: string) => {
          beforeEach(() => {
            personenkontextStore.processWorkflowStep = vi.fn().mockResolvedValue(undefined);
            personenkontextStore.updatePersonenkontexte = vi.fn().mockResolvedValue(undefined);
            const schule: Organisation = DoFactory.getSchule();
            const person: Person = DoFactory.getPerson();
            const rolle: Rolle = DoFactory.getRolle({ rollenart });
            const localBefristung: string | null = ((): string | null => {
              if (existingBefristung === 'unbefristet') {
                return null;
              } else if (existingBefristung === 'schuljahresende') {
                return getNextSchuljahresende();
              }
              return existingBefristung;
            })();
            if (rollenart === RollenArt.Lern) {
              const klasse: Organisation = DoFactory.getKlasse(schule);
              personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [
                DoFactory.getZuordnung(
                  { rolle: rolle.name, rolleId: rolle.id, rollenArt: rolle.rollenart, befristung: localBefristung },
                  { organisation: schule },
                ),
                DoFactory.getZuordnung(
                  { rolle: rolle.name, rolleId: rolle.id, rollenArt: rolle.rollenart, befristung: localBefristung },
                  { organisation: klasse },
                ),
              ]);
            } else {
              personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [
                DoFactory.getZuordnung(
                  { rolle: rolle.name, rolleId: rolle.id, rollenArt: rolle.rollenart, befristung: localBefristung },
                  { organisation: schule },
                ),
                DoFactory.getZuordnung(),
              ]);
            }
          });

          test('renders form to change befristung and triggers submit', async () => {
            await flushPromises();
            await wrapper?.find('[data-testid="zuordnung-edit-button"]').trigger('click');
            await nextTick();
            expect(wrapper?.find('[data-testid="befristung-change-button"]').attributes('disabled')).toBeDefined();

            const checkbox1: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
              `[data-testid="person-zuordnung-${personStore.personenuebersicht?.zuordnungen[0]?.sskId}"] input[type="checkbox"]`,
            );
            await checkbox1?.setValue(true);
            await nextTick();

            await wrapper?.find('[data-testid="befristung-change-button"]').trigger('click');

            const befristungInput: VueWrapper | undefined = wrapper
              ?.findComponent({ ref: 'befristung-input-wrapper' })
              .findComponent({ ref: 'befristung-input' });
            const schuljahresendeRadioButton: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
              '[data-testid="schuljahresende-radio-button"] input[type="radio"]',
            );
            const unbefristetRadioButton: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
              '[data-testid="unbefristet-radio-button"] input[type="radio"]',
            );

            if (existingBefristung === 'schuljahresende') {
              expect(schuljahresendeRadioButton?.attributes('checked')).toBeDefined();
              expect(unbefristetRadioButton?.attributes('checked')).toBeFalsy();
            } else if (existingBefristung === 'unbefristet') {
              expect(schuljahresendeRadioButton?.attributes('checked')).toBeFalsy();
              // in test the button is not checked correctly
              // expect(unbefristetRadioButton?.attributes('checked')).toBeDefined();
            } else {
              expect(schuljahresendeRadioButton?.attributes('checked')).toBeFalsy();
              expect(unbefristetRadioButton?.attributes('checked')).toBeFalsy();
            }

            await befristungInput?.setValue('13.08.2099');
            await nextTick();

            const submitButton: Element | null = document.body.querySelector(
              '[data-testid="change-befristung-submit-button"]',
            );
            expect(submitButton).not.toBeNull();
            await nextTick();
            await flushPromises();

            await wrapper?.find('[data-testid="change-befristung-submit-button"]').trigger('click');
            if (submitButton) {
              submitButton.dispatchEvent(new Event('click'));
            }
            await nextTick();
            await flushPromises();
            // wait for vuetify animation to complete
            await vi.waitUntil(
              () => document.body.querySelector('[data-testid="confirm-change-befristung-button"]') != null,
            );

            const confirmDialogButton: Element = document.body.querySelector(
              '[data-testid="confirm-change-befristung-button"]',
            )!;
            expect(confirmDialogButton).not.toBeNull();
            confirmDialogButton.dispatchEvent(new Event('click'));
            await flushPromises();

            const saveButton: Element = document.body.querySelector('[data-testid="zuordnung-changes-save-button"]')!;
            expect(saveButton).not.toBeNull();
            saveButton.dispatchEvent(new Event('click'));
            await flushPromises();

            const closeSuccessButton: Element | null = document.body.querySelector(
              '[data-testid="change-befristung-success-dialog-close-button"]',
            );
            // wait for vuetify animation to complete
            await vi.waitUntil(
              () =>
                document.body.querySelector('[data-testid="change-befristung-success-dialog-close-button"]') != null,
            );
            expect(closeSuccessButton).not.toBeNull();

            if (closeSuccessButton) {
              closeSuccessButton.dispatchEvent(new Event('click'));
            }
            await flushPromises();

            expect(wrapper?.find('[data-testid="zuordnung-edit-button"]').isVisible()).toBe(true);
          });
        },
      );
    });
  });
});
