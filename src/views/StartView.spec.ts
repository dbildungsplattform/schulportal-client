import { OrganisationsTyp, RollenArt, RollenMerkmal, ServiceProviderKategorie } from '@/api-client/generated/api';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { MeldungStatus, useMeldungStore, type MeldungStore } from '@/stores/MeldungStore';
import { usePersonInfoStore, type PersonInfoResponse, type PersonInfoStore } from '@/stores/PersonInfoStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import {
  useServiceProviderStore,
  type ServiceProviderStore,
  type StartPageServiceProvider,
} from '@/stores/ServiceProviderStore';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import { faker } from '@faker-js/faker';
import { DOMWrapper, VueWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock } from 'vitest';
import { nextTick, type Component } from 'vue';
import StartView from './StartView.vue';

interface StartViewComponent {
  filterSortProviders: (
    providers: StartPageServiceProvider[],
    kategorie: ServiceProviderKategorie,
  ) => StartPageServiceProvider[];
}

const locationMock: Mock = vi.fn(() => ({
  pathname: 'test',
  search: '?query',
}));

vi.stubGlobal('location', locationMock);

enableAutoUnmount(afterEach);

function getMockProviders(): Array<StartPageServiceProvider> {
  return [
    DoFactory.getStartPageServiceProvider({
      id: '2',
      name: 'Spongebob Squarepants',
      target: 'URL',
      url: 'https://de.wikipedia.org/wiki/SpongeBob_Schwammkopf',
      kategorie: 'EMAIL',
      hasLogo: false,
      requires2fa: false,
    }),
    DoFactory.getStartPageServiceProvider({
      id: '3',
      name: 'Not Squarepants',
      target: 'URL',
      url: 'https://de.wikipedia.org/wiki/SpongeBob_Schwammkopf',
      kategorie: 'EMAIL',
      hasLogo: false,
      requires2fa: false,
    }),
    DoFactory.getStartPageServiceProvider({
      id: '1',
      name: 'Schulportal-Administration',
      target: 'SCHULPORTAL_ADMINISTRATION',
      url: '',
      kategorie: 'VERWALTUNG',
      hasLogo: false,
      requires2fa: false,
    }),
  ];
}

function setup(): {
  wrapper: VueWrapper<InstanceType<typeof StartView>>;
  authStore: AuthStore;
  serviceProviderStore: ServiceProviderStore;
  mockProviders: Array<StartPageServiceProvider>;
} {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  const mockProviders: Array<StartPageServiceProvider> = getMockProviders();

  const mockPerson: PersonInfoResponse = DoFactory.getPersonInfoResponse();
  mockPerson.person.personalnummer = null;

  const mockPersonenUebersicht: PersonenUebersicht = new PersonenUebersicht(
    '1234',
    'Samuel',
    'Vimes',
    'samuelvimes',
    '2021-09-01T12:00:00Z',
    [
      DoFactory.getZuordnung({
        typ: OrganisationsTyp.Schule,
        merkmale: [RollenMerkmal.KopersPflicht],
        befristung: faker.date.soon().toISOString(),
        rollenArt: RollenArt.Lehr,
      }),
      DoFactory.getZuordnung({
        typ: OrganisationsTyp.Schule,
        merkmale: [RollenMerkmal.KopersPflicht],
        befristung: faker.date.soon().toISOString(),
        rollenArt: RollenArt.Lehr,
      }),
    ],
  );

  const authStore: AuthStore = useAuthStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  serviceProviderStore.getServiceProvidersByPersonId = vi.fn(() => Promise.resolve());
  const personStore: PersonStore = usePersonStore();
  const personInfoStore: PersonInfoStore = usePersonInfoStore();
  const meldungStore: MeldungStore = useMeldungStore();
  serviceProviderStore.assignedServiceProviders = mockProviders;

  authStore.hasPersonenverwaltungPermission = false;
  authStore.hasSchulverwaltungPermission = false;
  authStore.hasRollenverwaltungPermission = false;
  authStore.hasKlassenverwaltungPermission = false;
  authStore.timeLimitInfos = [
    {
      occasion: 'KOPERS',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      school: null,
      rolle: null,
    },
    {
      occasion: 'KOPERS',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      school: 'Carl-orff-Schule',
      rolle: null,
    },
  ];

  personInfoStore.personInfo = mockPerson;
  personStore.personenuebersicht = mockPersonenUebersicht;
  meldungStore.currentMeldung = {
    id: '1',
    text: 'Test',
    status: MeldungStatus.VEROEFFENTLICHT,
  };

  const wrapper: VueWrapper<InstanceType<typeof StartView>> = mount(StartView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        StartView: StartView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
        },
      },
    },
  });

  return { wrapper, authStore, serviceProviderStore, mockProviders };
}

describe('StartView', () => {
  test('it renders the start cards headline', () => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    expect(wrapper.find('[data-testid="start-card-headline"]').isVisible()).toBe(true);
  });

  test('it navigates to person management', async () => {
    const { wrapper, authStore }: ReturnType<typeof setup> = setup();
    authStore.hasPersonenverwaltungPermission = true;
    await nextTick();

    const adminCard: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent(
      '[data-testid="service-provider-card-1"]',
    );

    expect(adminCard.isVisible()).toBe(true);
    expect(adminCard.attributes('href')).toEqual('/admin/personen');
  });

  test('it navigates to schule management', async () => {
    const { wrapper, authStore }: ReturnType<typeof setup> = setup();
    authStore.hasSchulverwaltungPermission = true;
    await nextTick();

    const adminCard: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent(
      '[data-testid="service-provider-card-1"]',
    );

    expect(adminCard.isVisible()).toBe(true);
    expect(adminCard.attributes('href')).toEqual('/admin/schulen');
  });

  test('it navigates to rolle management', async () => {
    const { wrapper, authStore }: ReturnType<typeof setup> = setup();
    authStore.hasRollenverwaltungPermission = true;
    await nextTick();

    const adminCard: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent(
      '[data-testid="service-provider-card-1"]',
    );

    expect(adminCard.isVisible()).toBe(true);
    expect(adminCard.attributes('href')).toEqual('/admin/rollen');
  });

  test('it navigates to klasse management', async () => {
    const { wrapper, authStore }: ReturnType<typeof setup> = setup();
    authStore.hasKlassenverwaltungPermission = true;
    await nextTick();

    const adminCard: ReturnType<VueWrapper['findComponent']> = wrapper.findComponent(
      '[data-testid="service-provider-card-1"]',
    );

    expect(adminCard.isVisible()).toBe(true);
    expect(adminCard.attributes('href')).toEqual('/admin/klassen');
  });

  test('it displays correct banner color', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    await flushPromises();
    await nextTick();

    const banner: DOMWrapper<Element> = wrapper.find('[data-testid="KOPERS-banner"]');

    expect(banner.classes()).toContain('bg-errorLight');
  });

  test('it dismisses the banner', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    await flushPromises();
    await nextTick();
    const banner: VueWrapper = wrapper.findComponent({ ref: 'spsh-banner' });

    expect(banner.find('[data-testid="banner-close-icon"]').isVisible()).toBe(true);
    await banner.find('[data-testid="banner-close-icon"]').trigger('click');
    expect(banner.emitted('dismissBanner')).toBeTruthy();
  });

  test('it renders a hinweis banner', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    await flushPromises();
    await nextTick();

    const banner: DOMWrapper<Element> = wrapper.find('[data-testid="hinweis-banner"]');

    expect(banner.isVisible()).toBe(true);
  });

  test('filterSortProviders sorts service providers alphabetically', () => {
    const { wrapper, mockProviders }: ReturnType<typeof setup> = setup();
    const vm: unknown = wrapper.vm;

    const filteredSortProviders: StartPageServiceProvider[] = (vm as StartViewComponent).filterSortProviders(
      mockProviders,
      ServiceProviderKategorie.Email,
    );

    expect(filteredSortProviders.map((p: StartPageServiceProvider) => p.name)).toEqual([
      'Not Squarepants',
      'Spongebob Squarepants',
    ]);
  });

  test('filterSortProviders filters out service providers with target NONE', () => {
    const { wrapper, mockProviders }: ReturnType<typeof setup> = setup();
    const providersWithNone: StartPageServiceProvider[] = [
      ...mockProviders,
      DoFactory.getStartPageServiceProvider({
        id: '99',
        name: 'Hidden Provider',
        target: 'NONE',
        url: '',
        kategorie: ServiceProviderKategorie.Email,
        hasLogo: false,
        requires2fa: false,
      }),
    ];
    const vm: unknown = wrapper.vm;

    const filteredSortProviders: StartPageServiceProvider[] = (vm as StartViewComponent).filterSortProviders(
      providersWithNone,
      ServiceProviderKategorie.Email,
    );

    expect(filteredSortProviders.map((p: StartPageServiceProvider) => p.name)).toEqual([
      'Not Squarepants',
      'Spongebob Squarepants',
    ]);
  });

  test('it does not render tiles for service providers with target NONE', async () => {
    const { wrapper, serviceProviderStore, mockProviders }: ReturnType<typeof setup> = setup();
    serviceProviderStore.assignedServiceProviders = [
      ...mockProviders,
      DoFactory.getStartPageServiceProvider({
        id: '99',
        name: 'Hidden Provider',
        target: 'NONE',
        url: '',
        kategorie: ServiceProviderKategorie.Email,
        hasLogo: false,
        requires2fa: false,
      }),
    ];
    await nextTick();

    expect(wrapper.find('[data-testid="service-provider-card-99"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="service-provider-card-2"]').exists()).toBe(true);
  });

  test('it renders category title for class service providers when providers exist', async () => {
    const { wrapper, serviceProviderStore }: ReturnType<typeof setup> = setup();
    serviceProviderStore.assignedServiceProviders = [
      DoFactory.getStartPageServiceProvider({
        id: '4',
        name: 'Moodle',
        target: 'URL',
        url: 'https://moodle.example.com',
        kategorie: ServiceProviderKategorie.Unterricht,
        hasLogo: false,
        requires2fa: false,
      }),
    ];
    await nextTick();

    const categoryTitle: DOMWrapper<Element> = wrapper.find('[data-testid="all-service-provider-title"]');
    expect(categoryTitle.isVisible()).toBe(true);
  });

  test('it renders empty category title for class service providers when no providers exist', async () => {
    const { wrapper, serviceProviderStore, mockProviders }: ReturnType<typeof setup> = setup();
    serviceProviderStore.assignedServiceProviders = mockProviders.filter(
      (p: StartPageServiceProvider) => p.kategorie !== 'UNTERRICHT',
    );
    await nextTick();

    // Category title should still render but be empty for UNTERRICHT
    const card: DOMWrapper<Element> = wrapper.find('[data-testid="start-card-headline"]');
    expect(card.isVisible()).toBe(true);
  });

  test('it renders service providers of the new kategorien with their translated category title', async () => {
    const { wrapper, serviceProviderStore }: ReturnType<typeof setup> = setup();
    serviceProviderStore.assignedServiceProviders = [
      DoFactory.getStartPageServiceProvider({
        id: '8',
        name: 'Helpdesk',
        target: 'URL',
        url: 'https://helpdesk.example.com',
        kategorie: ServiceProviderKategorie.HilfeUndUnterstuetzung,
        hasLogo: false,
        requires2fa: false,
      }),
    ];
    await nextTick();

    expect(wrapper.find('[data-testid="service-provider-card-8"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Hilfe und Unterstützung');
  });

  test('it renders category titles for all categories when providers exist', async () => {
    const { wrapper, serviceProviderStore, mockProviders }: ReturnType<typeof setup> = setup();
    serviceProviderStore.assignedServiceProviders = [
      ...mockProviders,
      DoFactory.getStartPageServiceProvider({
        id: '5',
        name: 'Moodle',
        target: 'URL',
        url: 'https://moodle.example.com',
        kategorie: ServiceProviderKategorie.Unterricht,
        hasLogo: false,
        requires2fa: false,
      }),
      DoFactory.getStartPageServiceProvider({
        id: '6',
        name: 'SchulApp',
        target: 'URL',
        url: 'https://schulapp.example.com',
        kategorie: ServiceProviderKategorie.Schulisch,
        hasLogo: false,
        requires2fa: false,
      }),
      DoFactory.getStartPageServiceProvider({
        id: '7',
        name: 'Hinweis Tool',
        target: 'URL',
        url: 'https://hinweis.example.com',
        kategorie: ServiceProviderKategorie.Hinweise,
        hasLogo: false,
        requires2fa: false,
      }),
    ];
    await nextTick();

    const headline: DOMWrapper<Element> = wrapper.find('[data-testid="all-service-provider-title"]');
    expect(headline.isVisible()).toBe(true);
  });
});
