import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { ComponentInstance } from 'vue';
import { VDataTableServer } from 'vuetify/components';
import ResultTable from '@/components/admin/ResultTable.vue';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { OrganisationSortField, SortOrder } from '@/utils/sorting';
import BehoerdeManagementView from './BehoerdeManagementView.vue';

enableAutoUnmount(afterEach);

describe('BehoerdeManagementView', (): void => {
  let organisationStore: OrganisationStore;
  let wrapper: VueWrapper<ComponentInstance<typeof BehoerdeManagementView>>;

  beforeEach(async (): Promise<void> => {
    document.body.innerHTML = '<div id="app"></div>';
    organisationStore = useOrganisationStore();
    organisationStore.$reset();
    organisationStore.getAllOrganisationen = vi.fn().mockResolvedValue(undefined);
    wrapper = mount(BehoerdeManagementView, { attachTo: document.getElementById('app') || '' });
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
    expect(wrapper.getComponent({ name: 'ResultTable' }).props()).toMatchObject({
      headers: [{ title: 'Behördenname', key: 'name', align: 'start', sortable: false }],
      hideSelect: true,
      disableRowClick: true,
    });
    expect(wrapper.text()).not.toContain('Dienststellennummer');
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
    expect(wrapper.getComponent({ name: 'ResultTable' }).props()).toMatchObject({ currentPage: 1 });
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
