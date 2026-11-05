import { EmailAddressStatus, RollenArt, ServiceProviderSystem } from '@/api-client/generated';
import { useAuthStore, type AuthStore, type UserInfo } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { usePersonInfoStore, type PersonInfoResponse, type PersonInfoStore } from '@/stores/PersonInfoStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenMerkmal } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import {
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { faker } from '@faker-js/faker';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { beforeEach, describe, expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createMemoryHistory, createRouter, useRoute, type Router } from 'vue-router';
import ProfileView from './ProfileView.vue';

let wrapper: VueWrapper | null = null;
let personInfoStore: PersonInfoStore;
let personStore: PersonStore;
let authStore: AuthStore;
let configStore: ConfigStore;
let twoFactorAuthenticationStore: TwoFactorAuthentificationStore;
let serviceProviderStore: ServiceProviderStore;
let router: Router;

const mockPersonInfoResponse: PersonInfoResponse = DoFactory.getPersonInfoResponse();

const mockSchueler: PersonInfoResponse = DoFactory.getPersonInfoResponse();

const passwordUpdatedAt: Date = new Date(2024, 9, 9);
const mockCurrentUser: UserInfo = DoFactory.getUserinfoResponse({
  sub: mockPersonInfoResponse.person.id,
  password_updated_at: passwordUpdatedAt.toISOString(),
});

const mockLehrerUebersicht: PersonenUebersicht = new PersonenUebersicht(
  mockPersonInfoResponse.person.id,
  mockPersonInfoResponse.person.name.vorname,
  mockPersonInfoResponse.person.name.familiennamen,
  mockPersonInfoResponse.person.username!,
  '2021-09-01T12:00:00Z',
  [
    DoFactory.getZuordnung({
      sskId: '1',
      rolleId: '1',
      sskName: 'Muster-Schule',
      sskDstNr: '123456',
      rolle: 'Lehrer',
      rollenArt: RollenArt.Lehr,
      administriertVon: 'root-sh',
      typ: OrganisationsTyp.Schule,
      editable: true,
      merkmale: [RollenMerkmal.KopersPflicht],
      befristung: faker.date.future().toISOString(),
      admins: ['test'],
    }),
  ],
);

const mockLehrerUebersichtWith2Zuordnungen: PersonenUebersicht = new PersonenUebersicht(
  mockPersonInfoResponse.person.id,
  mockPersonInfoResponse.person.name.vorname,
  mockPersonInfoResponse.person.name.familiennamen,
  mockPersonInfoResponse.person.username!,
  '2021-09-01T12:00:00Z',
  [
    DoFactory.getZuordnung({
      rollenArt: RollenArt.Lern,
      typ: OrganisationsTyp.Schule,
      merkmale: [RollenMerkmal.KopersPflicht],
      befristung: faker.date.future().toISOString(),
    }),
    DoFactory.getZuordnung({
      rollenArt: RollenArt.Lern,
      typ: OrganisationsTyp.Schule,
      merkmale: [RollenMerkmal.KopersPflicht],
      befristung: faker.date.future().toISOString(),
    }),
  ],
);

const mockSchule: Organisation = DoFactory.getSchule();
const mockKlasse: Organisation = DoFactory.getKlasse(mockSchule);

const mockSchuelerUebersicht: PersonenUebersicht = new PersonenUebersicht(
  mockPersonInfoResponse.person.id,
  mockPersonInfoResponse.person.name.vorname,
  mockPersonInfoResponse.person.name.familiennamen,
  mockPersonInfoResponse.person.username!,
  '2021-09-01T12:00:00Z',
  [
    DoFactory.getZuordnung(
      {
        rollenArt: RollenArt.Lern,
        befristung: faker.date.future().toISOString(),
      },
      { organisation: mockSchule },
    ),
    DoFactory.getZuordnung(
      {
        rollenArt: RollenArt.Lern,
        befristung: faker.date.future().toISOString(),
      },
      { organisation: mockKlasse },
    ),
  ],
);
const mockSchuelerUebersichtWithReversedOrder: PersonenUebersicht = new PersonenUebersicht(
  mockPersonInfoResponse.person.id,
  mockPersonInfoResponse.person.name.vorname,
  mockPersonInfoResponse.person.name.familiennamen,
  mockPersonInfoResponse.person.username!,
  '2021-09-01T12:00:00Z',
  [
    DoFactory.getZuordnung(
      {
        rollenArt: RollenArt.Lern,
        befristung: faker.date.future().toISOString(),
      },
      { organisation: mockKlasse },
    ),
    DoFactory.getZuordnung(
      {
        rollenArt: RollenArt.Lern,
        befristung: faker.date.future().toISOString(),
      },
      { organisation: mockSchule },
    ),
  ],
);
const uebersichtWithoutZuordnungen: PersonenUebersicht = new PersonenUebersicht(
  mockPersonInfoResponse.person.id,
  mockPersonInfoResponse.person.name.vorname,
  mockPersonInfoResponse.person.name.familiennamen,
  mockPersonInfoResponse.person.username!,
  '2021-09-01T12:00:00Z',
  [],
);

describe('ProfileView', () => {
  beforeAll(() => {
    personInfoStore = usePersonInfoStore();
    personStore = usePersonStore();
    authStore = useAuthStore();
    twoFactorAuthenticationStore = useTwoFactorAuthentificationStore();
    configStore = useConfigStore();
    serviceProviderStore = useServiceProviderStore();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/profil',
          component: ProfileView as Component,
        },
      ],
    });
  });

  beforeEach(async () => {
    document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

    personInfoStore.personInfo = mockPersonInfoResponse;
    personStore.personenuebersicht = mockLehrerUebersicht;

    authStore.currentUser = mockCurrentUser;
    twoFactorAuthenticationStore.errorCode = '';
    twoFactorAuthenticationStore.loading = false;
    twoFactorAuthenticationStore.hasToken = true;
    twoFactorAuthenticationStore.required = true;

    router.push({
      path: '/profil',
      query: { kc_action_status: 'some_status' },
    });

    await router.isReady();

    wrapper = mount(ProfileView, {
      attachTo: document.getElementById('app') || '',
      global: {
        plugins: [router],
        mocks: {
          $route: useRoute(),
        },
      },
    });
  });

  test('it renders the profile headline', () => {
    personInfoStore.personInfo = mockPersonInfoResponse;
    personStore.personenuebersicht = mockLehrerUebersicht;
    expect(wrapper?.find('[data-testid="profile-headline"]').isVisible()).toBe(true);
  });

  test('it goes back to the previous page', () => {
    const push: MockInstance = vi.spyOn(router, 'push');

    wrapper?.find('[data-testid="back-to-previous-page-button"]').trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it displays personal data', () => {
    personInfoStore.personInfo = mockPersonInfoResponse;
    personStore.personenuebersicht = mockLehrerUebersicht;
    const personalData: DOMWrapper<HTMLTableRowElement>[] | undefined = wrapper?.findAll('tr');
    expect(personalData?.length).toBeGreaterThan(0);
    expect(personalData?.at(0)?.text()).toContain(
      `Vor- und Nachname:${mockPersonInfoResponse.person.name.vorname} ${mockPersonInfoResponse.person.name.familiennamen}`,
    );
    expect(personalData?.at(1)?.text()).toContain(`Benutzername:${mockPersonInfoResponse.person.username}`);
    if (mockPersonInfoResponse.person.personalnummer) {
      expect(personalData?.at(2)?.text()).toContain(mockPersonInfoResponse.person.personalnummer);
    }
  });

  test.each([
    { personInfo: mockPersonInfoResponse, uebersicht: mockLehrerUebersicht },
    { personInfo: mockPersonInfoResponse, uebersicht: mockLehrerUebersichtWith2Zuordnungen },
    { personInfo: mockPersonInfoResponse, uebersicht: uebersichtWithoutZuordnungen },
  ])(
    'it displays Schule data with zuordnungen $uebersicht.zuordnungen',
    async ({ personInfo, uebersicht }: { personInfo: PersonInfoResponse; uebersicht: PersonenUebersicht }) => {
      personInfoStore.personInfo = personInfo;
      personStore.personenuebersicht = uebersicht!;
      await nextTick();
      if (!wrapper) {
        return;
      }
      uebersicht.zuordnungen.forEach((mockZuordnung: Zuordnung, index: number) => {
        expect(wrapper?.find(`[data-testid="schule-value-${index + 1}"]`).text()).toContain(mockZuordnung.sskName);
        expect(wrapper?.find(`[data-testid="rolle-value-${index + 1}"]`).text()).toContain(mockZuordnung.rolle);
        expect(wrapper?.find(`[data-testid="dienststellennummer-value-${index + 1}"]`).text()).toContain(
          mockZuordnung.sskDstNr,
        );
      });
    },
  );

  describe.each([
    {
      label: 'normal',
      personenuebersicht: mockSchuelerUebersicht,
    },
    {
      label: 'reversed',
      personenuebersicht: mockSchuelerUebersichtWithReversedOrder,
    },
  ])('when order of zuordnungen is $label', ({ personenuebersicht }: { personenuebersicht: PersonenUebersicht }) => {
    test('it displays Schule data for SuS', async () => {
      personInfoStore.personInfo = mockSchueler;
      personStore.personenuebersicht = personenuebersicht;
      await nextTick();
      if (!wrapper) {
        return;
      }
      const klasse: Zuordnung = personenuebersicht.zuordnungen.find(
        (z: Zuordnung) => z.typ === OrganisationsTyp.Klasse,
      )!;
      const schule: Zuordnung = personenuebersicht.zuordnungen.find(
        (z: Zuordnung) => z.typ === OrganisationsTyp.Schule,
      )!;
      expect(wrapper.find('[data-testid="schule-value-1"]').text()).toContain(schule.sskName);
      expect(wrapper.find('[data-testid="rolle-value-1"]').text()).toContain(schule.rolle);
      expect(wrapper.find('[data-testid="dienststellennummer-value-1"]').text()).toContain(schule.sskDstNr);
      expect(wrapper.find('[data-testid="klasse-value-1"]').text()).toContain(klasse.sskName);
      expect(wrapper.find('[data-testid="rolle-value-1"]').text()).toContain(klasse.rolle);
    });
  });

  describe('password', () => {
    test('it displays password data if there is any', async () => {
      await nextTick();
      if (!wrapper) {
        return;
      }
      const container: DOMWrapper<Element> = wrapper.find('[data-testid="password-card"]');
      const passwordCardText: string = container.text();
      expect(passwordCardText).toContain(passwordUpdatedAt.getDate());
      expect(passwordCardText).toContain(passwordUpdatedAt.getMonth());
      expect(passwordCardText).toContain(passwordUpdatedAt.getFullYear());
    });

    test('it does not display password data if there is none', async () => {
      authStore.currentUser!.password_updated_at = null;
      await nextTick();
      if (!wrapper) {
        return;
      }
      const container: DOMWrapper<Element> = wrapper.find('[data-testid="password-card"]');
      const passwordCardText: string = container.text();
      expect(passwordCardText).not.toContain(passwordUpdatedAt.getDate());
      expect(passwordCardText).not.toContain(passwordUpdatedAt.getMonth());
      expect(passwordCardText).not.toContain(passwordUpdatedAt.getFullYear());
    });

    test('it opens and closes password change dialog', async () => {
      await nextTick();
      if (!wrapper) {
        return;
      }

      const passwordChangeButton: DOMWrapper<Element> = wrapper.find(
        '[data-testid="open-change-password-dialog-button"]',
      );
      passwordChangeButton.trigger('click');
      await nextTick();

      const closeDialogButton: HTMLElement = document.querySelector(
        '[data-testid="close-change-password-dialog-button"]',
      ) as HTMLElement;

      expect(closeDialogButton).not.toBeNull();
      closeDialogButton.click();
      await nextTick();
    });
  });

  describe('device password', () => {
    test('it opens device password change dialog', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personStore.personenuebersicht = mockLehrerUebersicht;
      configStore.configData = {
        befristungBearbeitenEnabled: true,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: false,
        schulischeAngeboteErstellen: true,
      };
      await nextTick();
      if (!wrapper) {
        return;
      }

      const devicePasswordChangeButton: DOMWrapper<Element> = wrapper.find(
        '[data-testid="open-device-password-dialog-button"]',
      );
      expect(devicePasswordChangeButton.exists()).toBe(false);
    });

    test('it opens device password change dialog', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personStore.personenuebersicht = mockLehrerUebersicht;
      serviceProviderStore.assignedServiceProviders = [
        DoFactory.getServiceProviderResponse({ externalSystem: ServiceProviderSystem.Uem }),
      ];
      configStore.configData = {
        befristungBearbeitenEnabled: true,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      await nextTick();
      if (!wrapper) {
        return;
      }

      const devicePasswordChangeButton: DOMWrapper<Element> = wrapper.find(
        '[data-testid="open-device-password-dialog-button"]',
      );
      devicePasswordChangeButton.trigger('click');
      await nextTick();

      expect(document.querySelector('[data-testid="password-reset-info-text"]')).not.toBeNull();

      const resetPasswordButton: HTMLElement = document.querySelector(
        '[data-testid="password-reset-button"]',
      ) as HTMLElement;

      expect(resetPasswordButton).not.toBeNull();
      resetPasswordButton.click();
      await nextTick();
    });
  });

  test('it displays 2FA section', async () => {
    twoFactorAuthenticationStore.hasToken = false;
    await nextTick();
    if (!wrapper) {
      return;
    }

    expect(document.querySelector('[data-testid="two-factor-card"]')).not.toBeNull();
    expect(wrapper.text()).not.toContain(
      'Bitte wenden Sie sich bei Fragen und Problemen an Ihre schulischen Administratorinnen und Administratoren.',
    );

    twoFactorAuthenticationStore.hasToken = true;
    await nextTick();
    expect(wrapper.text()).toContain(
      'Bitte wenden Sie sich bei Fragen und Problemen an Ihre schulischen Administratorinnen und Administratoren.',
    );
  });

  test('it does not display 2FA section if not required', async () => {
    twoFactorAuthenticationStore.hasToken = false;
    twoFactorAuthenticationStore.required = false;
    await nextTick();
    if (!wrapper) {
      return;
    }
    expect(document.querySelector('[data-testid="two-factor-card"]')).toBeNull();
    expect(document.querySelector('[data-testid="open-2FA-self-service-dialog-icon"]')).toBeNull();
  });

  test('it displays 2FA connection error', async () => {
    twoFactorAuthenticationStore.errorCode = 'PI_UNAVAILABLE_ERROR';
    await nextTick();
    if (!wrapper) {
      return;
    }
    const twoFactorCard: DOMWrapper<Element> = wrapper.find('[data-testid="two-factor-info"]');
    expect(twoFactorCard.text()).toContain(
      'Der Server für die Zwei-Faktor-Authentifizierung kann aktuell nicht erreicht werden. Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut.',
    );
    expect(document.querySelector('[data-testid="open-2FA-self-service-dialog-icon"]')).toBeNull();
  });

  describe('email', () => {
    test('displays correct email status for enabled', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personInfoStore.personInfo.email = {
        address: 'test@example.com',
        status: EmailAddressStatus.Enabled,
      };

      await nextTick();

      const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-value"]');
      expect(emailElement?.text()).toBe('test@example.com');
    });

    test('displays correct email status for requested', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personInfoStore.personInfo.email = {
        address: 'test@example.com',
        status: EmailAddressStatus.Requested,
      };

      await nextTick();

      const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-value"]');
      expect(emailElement?.text()).toBe('wird erzeugt');
    });

    test('displays correct email status for disabled', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personInfoStore.personInfo.email = {
        address: 'test@example.com',
        status: EmailAddressStatus.Disabled,
      };

      await nextTick();

      const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-value"]');
      expect(emailElement?.text()).toBe('deaktiviert');
    });

    test('displays correct email status for failed', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personInfoStore.personInfo.email = {
        address: 'test@example.com',
        status: EmailAddressStatus.Failed,
      };

      await nextTick();

      const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-value"]');
      expect(emailElement?.text()).toBe('fehlerhaft');
    });

    test('hides email when its not set', async () => {
      personInfoStore.personInfo = mockPersonInfoResponse;
      personInfoStore.personInfo.email = null;

      await nextTick();

      const emailElement: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="person-email-value"]');
      expect(emailElement?.exists()).toBe(false);
    });
  });
});
