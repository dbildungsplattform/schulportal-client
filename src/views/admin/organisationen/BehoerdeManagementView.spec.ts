import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { ComponentInstance } from 'vue';
import { VDataTableServer } from 'vuetify/components';
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router';
import routes from '@/router/routes';
import ResultTable from '@/components/admin/ResultTable.vue';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { OrganisationSortField, SortOrder } from '@/utils/sorting';
import BehoerdeManagementView from './BehoerdeManagementView.vue';

enableAutoUnmount(afterEach);

describe('BehoerdeManagementView', (): void => {
  let organisationStore: OrganisationStore;
  let router: Router;
  let wrapper: VueWrapper<ComponentInstance<typeof BehoerdeManagementView>>;

  beforeEach(async (): Promise<void> => {
    document.body.innerHTML = '<div id="app"></div>';
    organisationStore = useOrganisationStore();
    organisationStore.$reset();
    organisationStore.getAllOrganisationen = vi.fn().mockResolvedValue(undefined);
    router = createRouter({ history: createMemoryHistory(), routes });
    await router.push({ name: 'behoerde-management' });
    await router.isReady();
    wrapper = mount(BehoerdeManagementView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await flushPromises();
  });

  it('should request authorized Behoerden sorted by name on mount', (): void => {
    expect(organisationStore.getAllOrganisationen).toHaveBeenCalledExactlyOnceWith({
      offset: 0,
      limit: 30,
      includeTyp: OrganisationsTyp.Behoerde,
      systemrechte: ['BEHOERDEN_VERWALTEN'],
      sortField: OrganisationSortField.Name,
      sortOrder: SortOrder.Asc,
    });
  });

  it('should show only the name column without selection or quick actions', async (): Promise<void> => {
    organisationStore.allOrganisationen = [DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde })];
    organisationStore.totalOrganisationen = 1;
    await flushPromises();

    expect(wrapper.text()).toContain(organisationStore.allOrganisationen[0]!.name);
    expect(wrapper.getComponent(ResultTable).props('headers')).toEqual([
      { title: 'Behördenname', key: 'name', align: 'start', sortable: false },
    ]);
    expect(wrapper.getComponent(ResultTable).props('hideSelect')).toBe(true);
    expect(wrapper.getComponent(ResultTable).props('disableRowClick')).toBe(false);
    expect(wrapper.text()).not.toContain('Dienststellennummer');
  });

  it.each(['click', 'keydown'])('should open the selected Behoerde on %s', async (event: string): Promise<void> => {
    organisationStore.allOrganisationen = [DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde })];
    organisationStore.totalOrganisationen = 1;
    await flushPromises();
    const navigation: Promise<void> = new Promise((resolve: (value: void | PromiseLike<void>) => void): void => {
      router.afterEach((): void => resolve());
    });
    await wrapper.get('tbody tr.v-data-table__tr').trigger(event, { key: 'Enter' });
    expect(wrapper.getComponent(ResultTable).emitted('onHandleRowClick')).toBeTruthy();
    await navigation;
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('behoerde-details');
    expect(router.currentRoute.value.params['id']).toBe(organisationStore.allOrganisationen[0]!.id);
  });

  it('should fetch the requested page and reset the page when the limit changes', async (): Promise<void> => {
    organisationStore.totalOrganisationen = 100;
    await flushPromises();
    wrapper.getComponent(VDataTableServer).vm.$emit('update:page', 3);
    await flushPromises();
    expect(organisationStore.getAllOrganisationen).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 60, limit: 30 }),
    );

    wrapper.getComponent(VDataTableServer).vm.$emit('update:itemsPerPage', 50);
    await flushPromises();
    expect(organisationStore.getAllOrganisationen).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0, limit: 50 }),
    );
    expect(wrapper.getComponent(ResultTable).props('currentPage')).toBe(1);
  });

  it('should clear loading errors when navigating to another administration view', async (): Promise<void> => {
    wrapper.unmount();
    const routedWrapper: VueWrapper = mount(RouterView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await vi.dynamicImportSettled();
    await flushPromises();
    organisationStore.errorCode = 'UNSPECIFIED_ERROR';
    await flushPromises();
    expect(routedWrapper.find('[data-testid="behoerde-loading-error"]').exists()).toBe(true);

    await router.push({ name: 'schultraeger-management' });
    await vi.dynamicImportSettled();
    await flushPromises();

    expect(organisationStore.errorCode).toBe('');
    expect(routedWrapper.findComponent(ResultTable).exists()).toBe(true);
  });

  it('should display loading failures and retry fetching the list', async (): Promise<void> => {
    organisationStore.errorCode = 'UNSPECIFIED_ERROR';
    await flushPromises();
    expect(wrapper.find('[data-testid="behoerde-loading-error"]').exists()).toBe(true);
    expect(wrapper.findComponent(ResultTable).exists()).toBe(false);

    await wrapper.get('[data-testid="spsh-alert-button"]').trigger('click');
    await flushPromises();
    expect(organisationStore.errorCode).toBe('');
    expect(wrapper.findComponent(ResultTable).exists()).toBe(true);
  });
});
