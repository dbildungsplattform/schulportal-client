import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import { DoFactory } from 'test/DoFactory';
import routes from '@/router/routes';
import applicationRouter from '@/router';
import { StepUpLevel, useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useMasterDataStore, type MasterDataStore } from '@/stores/MasterDataStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import BehoerdeDetailsView from './BehoerdeDetailsView.vue';

enableAutoUnmount(afterEach);

describe('BehoerdeDetailsView', (): void => {
  let organisationStore: OrganisationStore;
  let router: Router;
  let behoerde: Organisation;
  let parent: Organisation;
  let wrapper: VueWrapper<ComponentInstance<typeof BehoerdeDetailsView>>;

  beforeEach(async (): Promise<void> => {
    document.body.innerHTML = '<div id="app"></div>';
    organisationStore = useOrganisationStore();
    organisationStore.$reset();
    parent = DoFactory.getOrganisation({ typ: OrganisationsTyp.Land });
    behoerde = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde, administriertVon: parent.id });
    organisationStore.getOrganisationById = vi.fn((): Promise<void> => {
      organisationStore.currentOrganisation = behoerde;
      return Promise.resolve();
    });
    organisationStore.getParentOrganisationsByIds = vi.fn((): Promise<void> => {
      organisationStore.parentOrganisationen = [DoFactory.getOrganisation({ typ: OrganisationsTyp.Root }), parent];
      return Promise.resolve();
    });
    router = createRouter({ history: createMemoryHistory(), routes });
    await router.push({ name: 'behoerde-details', params: { id: behoerde.id } });
    await router.isReady();
  });

  async function mountView(): Promise<void> {
    wrapper = mount(BehoerdeDetailsView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await flushPromises();
  }

  it('should load the selected Behoerde and resolve its Zustaendigkeitsbereich from its parents', async (): Promise<void> => {
    await mountView();
    expect(organisationStore.getOrganisationById).toHaveBeenCalledWith(behoerde.id);
    expect(organisationStore.getParentOrganisationsByIds).toHaveBeenCalledWith([behoerde.id]);
    expect(wrapper.get('[data-testid="behoerde-details-headline"]').text()).toBe('Behörde bearbeiten');
    expect(wrapper.get('[data-testid="behoerde-name"]').text()).toBe(behoerde.name);
    expect(wrapper.get('[data-testid="behoerde-zustaendigkeitsbereich"]').text()).toBe(parent.name);
    expect(wrapper.text()).not.toContain('Dienststellennummer');
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it.each([OrganisationsTyp.Schule, OrganisationsTyp.Traeger, OrganisationsTyp.Land])(
    'should reject an organisation of type %s',
    async (typ: OrganisationsTyp): Promise<void> => {
      behoerde = DoFactory.getOrganisation({ typ });

      await mountView();
      await vi.dynamicImportSettled();
      await flushPromises();

      expect(router.currentRoute.value.name).toBe('not-found');
      expect(organisationStore.getParentOrganisationsByIds).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="behoerde-details-container"]').exists()).toBe(false);
    },
  );

  it('should close the overview and return to the list', async (): Promise<void> => {
    await mountView();
    await wrapper.get('[data-testid="close-layout-card-button"]').trigger('click');
    await vi.dynamicImportSettled();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('behoerde-management');
  });

  it('should display the Land ancestor rather than the direct parent', async (): Promise<void> => {
    const directParent: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    behoerde.administriertVon = directParent.id;
    organisationStore.getParentOrganisationsByIds = vi.fn((): Promise<void> => {
      organisationStore.parentOrganisationen = [directParent, parent];
      return Promise.resolve();
    });
    await mountView();
    expect(wrapper.get('[data-testid="behoerde-zustaendigkeitsbereich"]').text()).toBe(parent.name);
  });

  it.each(['organisation', 'parents'])(
    'should show an error when loading %s fails',
    async (request: string): Promise<void> => {
      const failRequest = (): Promise<void> => {
        organisationStore.errorCode = 'UNSPECIFIED_ERROR';
        return Promise.resolve();
      };
      if (request === 'organisation') {
        organisationStore.getOrganisationById = vi.fn(failRequest);
      } else {
        organisationStore.getParentOrganisationsByIds = vi.fn(failRequest);
      }
      organisationStore.currentOrganisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      organisationStore.parentOrganisationen = [DoFactory.getOrganisation({ typ: OrganisationsTyp.Land })];
      await mountView();
      expect(wrapper.find('[data-testid="behoerde-details-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="behoerde-details-container"]').exists()).toBe(false);
      if (request === 'organisation') {
        expect(organisationStore.getParentOrganisationsByIds).not.toHaveBeenCalled();
        expect(organisationStore.currentOrganisation).toBeNull();
      }
      expect(organisationStore.parentOrganisationen).toEqual([]);
    },
  );

  it('should clear loading errors when navigating to another administration view', async (): Promise<void> => {
    const routedWrapper: VueWrapper = mount(RouterView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await vi.dynamicImportSettled();
    await flushPromises();
    organisationStore.errorCode = 'UNSPECIFIED_ERROR';
    await flushPromises();
    expect(routedWrapper.find('[data-testid="behoerde-details-error"]').exists()).toBe(true);

    await router.push({ name: 'schultraeger-management' });
    await vi.dynamicImportSettled();
    await flushPromises();

    expect(organisationStore.errorCode).toBe('');
    expect(routedWrapper.findComponent({ name: 'ResultTable' }).exists()).toBe(true);
  });

  it('should protect the overview with the Behoerden permission', (): void => {
    expect(router.currentRoute.value.meta).toMatchObject({
      requiresAuth: true,
      requiresPermission: 'behoerdenverwaltung',
    });
  });

  describe('Behoerden route permissions', (): void => {
    let authStore: AuthStore;
    let masterDataStore: MasterDataStore;

    beforeEach(async (): Promise<void> => {
      authStore = useAuthStore();
      authStore.$reset();
      authStore.isAuthenticated = true;
      authStore.acr = StepUpLevel.GOLD;
      masterDataStore = useMasterDataStore();
      masterDataStore.$reset();
      vi.spyOn(masterDataStore, 'isInitialized').mockReturnValue(true);
      await applicationRouter.push('/not-found');
    });

    afterEach((): void => {
      vi.restoreAllMocks();
      authStore.$reset();
      masterDataStore.$reset();
      sessionStorage.removeItem('previousUrl');
    });

    it.each([
      ['behoerde-management', false],
      ['behoerde-management', true],
      ['behoerde-details', false],
      ['behoerde-details', true],
    ])(
      'should enforce permission for %s when permission is %s',
      async (name: string, hasPermission: boolean): Promise<void> => {
        authStore.hasBehoerdenverwaltungPermission = hasPermission;

        await applicationRouter.push(name === 'behoerde-details' ? { name, params: { id: behoerde.id } } : { name });
        await flushPromises();

        expect(applicationRouter.currentRoute.value.name).toBe(hasPermission ? name : 'not-found');
      },
    );
  });
});
