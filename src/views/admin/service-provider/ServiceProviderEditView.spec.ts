import SuccessTemplate from '@/components/admin/service-provider/SuccessTemplate.vue';
import { ServiceProviderFormProps } from '@/components/admin/service-provider/types';
import routes from '@/router/routes';
import { RollenArt, RollenSystemRecht } from '@/stores/RolleStore';
import {
  ServiceProviderKategorie,
  ServiceProviderMerkmal,
  useServiceProviderStore,
  type ManageableServiceProviderDetail,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import ServiceProviderEditView from '@/views/admin/service-provider/ServiceProviderEditView.vue';
import { DOMWrapper, enableAutoUnmount, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { Mock, MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';

enableAutoUnmount(afterEach);

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

vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
  const mod: object = await importOriginal();
  return {
    ...mod,
    onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
      storedBeforeRouteLeaveCallback = actualCallback;
    }),
  };
});

let wrapper: VueWrapper | null = null;
let router: ReturnType<typeof createRouter>;
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

async function mountComponent(): Promise<ReturnType<typeof mount<typeof ServiceProviderEditView>>> {
  await vi.dynamicImportSettled();
  return mount(ServiceProviderEditView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderEditView: ServiceProviderEditView as Component,
      },
      plugins: [router],
    },
  });
}

type FormFields = {
  name: string;
  url: string;
  kategorie: ServiceProviderKategorie;
};

type FormSelectors = {
  orgSelect: VueWrapper;
  nameInput: DOMWrapper<Element>;
  urlInput: DOMWrapper<Element>;
  kategorieSelect: DOMWrapper<Element>;
  nachtraeglichZuweisbarSelect: DOMWrapper<Element>;
  verfuegbarFuerRollenerweiterungSelect: DOMWrapper<Element>;
  requires2faSelect: DOMWrapper<Element>;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { name, url, kategorie }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  if (name) {
    const nameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="name-input"]');
    expect(nameInput?.exists()).toBe(true);
    await nameInput?.find('input').setValue(name);
    await nextTick();
    selectors.nameInput = nameInput;
  }

  if (url) {
    const urlInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="url-input"]');
    expect(urlInput?.exists()).toBe(true);
    await urlInput?.find('input').setValue(url);
    await nextTick();
    selectors.urlInput = urlInput;
  }

  if (kategorie) {
    const kategorieSelect: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="kategorie-select"]');
    kategorieSelect?.setValue(kategorie);
    await nextTick();
    selectors.kategorieSelect = kategorieSelect;
  }

  return selectors;
}

describe('ServiceProviderEditView', () => {
  beforeEach(async () => {
    await vi.dynamicImportSettled();
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
    router = createRouter({
      history: createWebHistory(),
      routes,
    });
    serviceProviderStore.$reset();
    const testServiceProvider: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
      relevantSystemrechte: [RollenSystemRecht.AngeboteVerwalten],
    });
    serviceProviderStore.currentServiceProvider = testServiceProvider;
    router.push({ name: 'angebot-details', params: { id: testServiceProvider.id } });
    await router.isReady();
    wrapper = await mountComponent();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the headline and form', () => {
    expect(wrapper?.find('[data-testid="admin-headline"]').exists()).toBe(true);
    expect(wrapper?.findComponent({ name: 'ServiceProviderForm' }).exists()).toBe(true);
  });

  it('passes anbietenInMerkmale in initialValues when corresponding merkmale exist', async () => {
    const testServiceProvider: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
      relevantSystemrechte: [RollenSystemRecht.AngeboteVerwalten],
      merkmale: [
        ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ],
    });
    serviceProviderStore.currentServiceProvider = testServiceProvider;
    router.push({ name: 'angebot-details', params: { id: testServiceProvider.id } });
    await router.isReady();
    wrapper = await mountComponent();

    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper.findComponent({ name: 'ServiceProviderForm' });
    expect(form.props('initialValues')).toMatchObject<ServiceProviderFormProps['initialValues']>({
      anbietenInMerkmale: [
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ],
      rollenartenWhitelist: [],
    });
  });

  it('edits and saves a service provider, calling the store', async () => {
    const spy: Mock = vi.spyOn(serviceProviderStore, 'updateServiceProvider').mockResolvedValue();
    const validEdit: Parameters<typeof serviceProviderStore.updateServiceProvider>[1] = {
      name: 'Neuer Name',
      url: 'https://neue-url.de',
      logoId: undefined,
      kategorie: serviceProviderStore.currentServiceProvider?.kategorie,
      merkmale: serviceProviderStore.currentServiceProvider?.merkmale || [],
      rollenartenWhitelist: serviceProviderStore.currentServiceProvider?.rollenartenWhitelist || [],
      requires2fa: false,
    };
    const form: VueWrapper = wrapper!.findComponent({ name: 'ServiceProviderForm' });
    form.vm.$emit('click:submit', validEdit);
    await flushPromises();
    expect(spy).toHaveBeenCalledWith(serviceProviderStore.currentServiceProvider?.id, validEdit);
    spy.mockRestore();
  });

  it('renders rollenarten whitelist in success view from backend response, not cached submit values', async () => {
    const spy: Mock = vi.spyOn(serviceProviderStore, 'updateServiceProvider').mockImplementation(() => {
      const currentServiceProvider: ManageableServiceProviderDetail | null =
        serviceProviderStore.currentServiceProvider;
      if (!currentServiceProvider) {
        throw new Error('Expected current service provider to be set');
      }

      serviceProviderStore.updatedServiceProvider = {
        id: currentServiceProvider.id,
        name: currentServiceProvider.name,
        url: currentServiceProvider.url,
        kategorie: currentServiceProvider.kategorie,
        merkmale: currentServiceProvider.merkmale ?? [],
        requires2fa: currentServiceProvider.requires2fa ?? false,
        rollenartenWhitelist: [RollenArt.Orgadmin],
      };
      return Promise.resolve();
    });

    const form: VueWrapper = wrapper!.findComponent({ name: 'ServiceProviderForm' });
    form.vm.$emit('click:submit', {
      name: 'Neuer Name',
      url: 'https://neue-url.de',
      logoId: undefined,
      kategorie: serviceProviderStore.currentServiceProvider?.kategorie,
      merkmale: serviceProviderStore.currentServiceProvider?.merkmale || [],
      rollenartenWhitelist: [RollenArt.Lern],
      requires2fa: false,
    });
    await flushPromises();

    expect(wrapper!.findComponent(SuccessTemplate).exists()).toBe(true);
    expect(wrapper!.find('[data-testid="success-rollenarten-whitelist"]').text()).toBe('Orgadmin');
    spy.mockRestore();
  });

  test('it closes the view and navigates back to service provider table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  describe.each([[true], [false]])('when edit is schulspezifisch:%s', (isSchulspezifisch: boolean) => {
    it.each([
      [
        'back to list',
        '[data-testid="to-service-provider-list-button"]',
        { name: isSchulspezifisch ? 'angebot-management-schulspezifisch' : 'angebot-management' },
      ],
      [
        'back to service provider',
        '[data-testid="to-service-provider-details-button"]',
        { name: isSchulspezifisch ? 'angebot-details-schulspezifisch' : 'angebot-details', params: { id: '' } },
      ],
    ])(
      'calls router.push with correct arguments when clicking "%s"',
      async (_label: string, buttonSelector: string, args: Parameters<Router['push']>[0]) => {
        if (isSchulspezifisch) {
          await router.push({
            name: 'angebot-edit',
            params: { id: serviceProviderStore.currentServiceProvider?.id },
            query: { orga: 'schule-id' },
          });
        }
        wrapper = await mountComponent();
        const pushSpy: Mock = vi.spyOn(router, 'push').mockResolvedValue();
        const form: VueWrapper = wrapper.findComponent({ name: 'ServiceProviderForm' });
        const validEdit: Parameters<typeof serviceProviderStore.updateServiceProvider>[1] = {
          name: 'Neuer Name',
          url: 'https://neue-url.de',
          logoId: undefined,
          kategorie: serviceProviderStore.currentServiceProvider?.kategorie,
          merkmale: serviceProviderStore.currentServiceProvider?.merkmale || [],
          rollenartenWhitelist: serviceProviderStore.currentServiceProvider?.rollenartenWhitelist || [],
          requires2fa: false,
        };
        form.vm.$emit('click:submit', validEdit);
        serviceProviderStore.updatedServiceProvider = {
          id: serviceProviderStore.currentServiceProvider?.id ?? '',
          name: validEdit.name!,
          url: validEdit.url!,
          kategorie: validEdit.kategorie!,
          merkmale: validEdit.merkmale!,
          requires2fa: validEdit.requires2fa!,
        };
        await flushPromises();

        const closeButton: HTMLElement | null = document.querySelector(buttonSelector);
        expect(closeButton).not.toBeNull();
        (closeButton as HTMLElement).click();
        await flushPromises();
        if (typeof args !== 'string') {
          if ('params' in args) {
            args.params = { id: serviceProviderStore.currentServiceProvider?.id };
          }
          if (isSchulspezifisch) {
            args.query = { orga: 'schule-id' };
          }
        }
        expect(pushSpy).toHaveBeenCalledWith(args);
        pushSpy.mockRestore();
      },
    );
  });

  describe.each([[false], [true]])('when form is dirty:%s', (isFormDirty: boolean) => {
    test('it handles unloading', async () => {
      wrapper = await mountComponent();
      if (isFormDirty) {
        await fillForm({
          name: 'Test Service Provider',
          url: 'https://test.example.com',
        });
        await flushPromises();
      }
      const event: Event = new Event('beforeunload');
      const spy: MockInstance = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);
      if (isFormDirty) {
        expect(spy).toHaveBeenCalledOnce();
      } else {
        expect(spy).not.toHaveBeenCalledOnce();
      }
    });
  });
});

describe('ServiceProviderEditView navigation guard', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
    const testServiceProvider: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
      relevantSystemrechte: [RollenSystemRecht.AngeboteVerwalten],
    });
    serviceProviderStore.currentServiceProvider = testServiceProvider;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('triggers, if form is dirty', async () => {
    const expectedCallsToNext: number = 0;
    wrapper = await mountComponent();
    await fillForm({
      name: 'Test Service Provider',
      url: 'https://test.example.com',
    });

    const spy: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
    expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
    await nextTick();

    const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
    expect(confirmButton).not.toBeNull();
    confirmButton!.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalledOnce();
  });

  test('does not trigger, if form is not dirty', async () => {
    const expectedCallsToNext: number = 1;
    wrapper = await mountComponent();
    const spy: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
    expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
  });
});
