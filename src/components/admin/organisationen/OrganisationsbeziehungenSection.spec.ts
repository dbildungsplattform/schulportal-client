import { useOrganisationsbeziehungStore, type OrganisationsbeziehungStore } from '@/stores/OrganisationsbeziehungStore';
import { SortFieldOrganisationsbeziehung } from '@/api-client/generated/api';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import OrganisationsbeziehungenSection from './OrganisationsbeziehungenSection.vue';

let wrapper: VueWrapper | null = null;
let store: OrganisationsbeziehungStore;

beforeEach(() => {
  store = useOrganisationsbeziehungStore();
  store.beziehungen = [];
  store.total = 0;
  store.errorCode = '';
  store.loading = false;
  vi.mocked(store.loadBeziehungen).mockClear();

  wrapper = mount(OrganisationsbeziehungenSection, {
    attachTo: document.body,
    props: { organisationId: 'org-1' },
  });
});

afterEach(() => {
  wrapper?.unmount();
});

async function openSection(): Promise<void> {
  await wrapper!.get('[data-testid="organisationsbeziehungen-toggle-button"]').trigger('click');
  await flushPromises();
}

function getResultTable(): VueWrapper {
  return wrapper!.findComponent({ name: 'ResultTable' });
}

describe('OrganisationsbeziehungenSection', () => {
  test('it renders the headline and does not load data while collapsed', () => {
    expect(wrapper!.get('[data-testid="organisationsbeziehungen-headline"]').text()).toBe('Organisationsbeziehungen');
    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });

  test('it toggles aria-expanded and loads data when opened', async () => {
    const toggle: ReturnType<VueWrapper['get']> = wrapper!.get(
      '[data-testid="organisationsbeziehungen-toggle-button"]',
    );
    expect(toggle.attributes('aria-expanded')).toBe('false');

    await openSection();

    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(store.loadBeziehungen).toHaveBeenCalledExactlyOnceWith('org-1', {
      offset: 0,
      limit: 30,
      searchString: '',
      sortField: 'typ',
      sortOrder: 'asc',
    });
  });

  test('it renders the related organisation when the current organisation is the quelle', async () => {
    store.beziehungen = [
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: 'org-1', name: 'Aktuelle Schule', dienststellennummer: '1111111' },
        ziel: { id: 'z-1', name: 'Zielträger', dienststellennummer: null },
      }),
    ];
    store.total = 1;
    await openSection();

    const text: string = wrapper!.get('[data-testid="organisationsbeziehungen-table"]').text();
    expect(text).toContain('Schulträger');
    expect(text).toContain('Zielträger');
    expect(text).toContain('---');
    expect(text).not.toContain('Aktuelle Schule');
    expect(text).not.toContain('1111111');
  });

  test('it renders the related organisation when the current organisation is the ziel', async () => {
    store.beziehungen = [
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: 'q-1', name: 'Quellschule', dienststellennummer: '1234567' },
        ziel: { id: 'org-1', name: 'Aktuelle Schule', dienststellennummer: '1111111' },
      }),
    ];
    store.total = 1;
    await openSection();

    const text: string = wrapper!.get('[data-testid="organisationsbeziehungen-table"]').text();
    expect(text).toContain('Quellschule');
    expect(text).toContain('1234567');
    expect(text).not.toContain('Aktuelle Schule');
    expect(text).not.toContain('1111111');
  });

  test('it skips rows where neither quelle nor ziel is the current organisation', async () => {
    store.beziehungen = [
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: 'x-1', name: 'Fremde Quelle', dienststellennummer: '2222222' },
        ziel: { id: 'x-2', name: 'Fremdes Ziel', dienststellennummer: '3333333' },
      }),
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: 'org-1', name: 'Aktuelle Schule', dienststellennummer: '1111111' },
        ziel: { id: 'z-1', name: 'Gültiges Ziel', dienststellennummer: '4444444' },
      }),
    ];
    store.total = 2;
    await openSection();

    const text: string = wrapper!.get('[data-testid="organisationsbeziehungen-table"]').text();
    expect(text).toContain('Gültiges Ziel');
    expect(text).not.toContain('Fremde Quelle');
    expect(text).not.toContain('Fremdes Ziel');
  });

  test('it shows the Dienststellennummer column by default', async () => {
    await openSection();

    expect(wrapper!.get('[data-testid="organisationsbeziehungen-table"]').text()).toContain('Dienststellennummer');
  });

  test('it hides the Dienststellennummer column when showDienststellennummerColumn is false', async () => {
    wrapper!.unmount();
    wrapper = mount(OrganisationsbeziehungenSection, {
      attachTo: document.body,
      props: { organisationId: 'org-1', showDienststellennummerColumn: false },
    });
    await openSection();

    const text: string = wrapper.get('[data-testid="organisationsbeziehungen-table"]').text();
    expect(text).toContain('Name');
    expect(text).not.toContain('Dienststellennummer');
  });

  test('it reloads from the first page when a search is applied', async () => {
    await openSection();
    vi.mocked(store.loadBeziehungen).mockClear();

    wrapper!.findComponent({ name: 'OrganisationsbeziehungenFilter' }).vm.$emit('onApplySearchFilter', 'Schule');
    await flushPromises();

    expect(store.loadBeziehungen).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      expect.objectContaining({ offset: 0, searchString: 'Schule' }),
    );
  });

  test('it does not reload when the applied search string did not change', async () => {
    await openSection();
    vi.mocked(store.loadBeziehungen).mockClear();

    wrapper!.findComponent({ name: 'OrganisationsbeziehungenFilter' }).vm.$emit('onApplySearchFilter', '');
    await flushPromises();

    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });

  test('it passes the related organisations as items to the filter', async () => {
    store.beziehungen = [
      DoFactory.getOrganisationsbeziehung({
        quelle: { id: 'org-1', name: 'Aktuelle Schule', dienststellennummer: '1111111' },
        ziel: { id: 'z-1', name: 'Zielträger', dienststellennummer: null },
      }),
    ];
    await openSection();

    expect(wrapper!.findComponent({ name: 'OrganisationsbeziehungenFilter' }).props('items')).toEqual([
      { id: 'z-1', name: 'Zielträger', dienststellennummer: null },
    ]);
  });

  test('it shows an error alert instead of the table when loading failed', async () => {
    store.errorCode = 'UNSPECIFIED_ERROR';
    await openSection();

    expect(wrapper!.find('[data-testid="organisationsbeziehungen-error-alert"]').exists()).toBe(true);
    expect(wrapper!.find('[data-testid="organisationsbeziehungen-table"]').exists()).toBe(false);
  });

  test('it does not reload data when the section is collapsed again', async () => {
    await openSection();
    vi.mocked(store.loadBeziehungen).mockClear();

    await openSection();

    expect(wrapper!.get('[data-testid="organisationsbeziehungen-toggle-button"]').attributes('aria-expanded')).toBe(
      'false',
    );
    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });

  test('it loads the requested page when the page is updated', async () => {
    await openSection();
    vi.mocked(store.loadBeziehungen).mockClear();

    getResultTable().vm.$emit('onPageUpdate', 2);
    await flushPromises();

    expect(store.loadBeziehungen).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ offset: 30, limit: 30 }),
    );
  });

  test('it resets to the first page when the items per page are updated', async () => {
    await openSection();
    getResultTable().vm.$emit('onPageUpdate', 3);
    await flushPromises();
    vi.mocked(store.loadBeziehungen).mockClear();

    getResultTable().vm.$emit('onItemsPerPageUpdate', 10);
    await flushPromises();

    expect(store.loadBeziehungen).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      expect.objectContaining({ offset: 0, limit: 10 }),
    );
  });

  test('it reloads from the first page with the new sorting when the table is sorted', async () => {
    await openSection();
    getResultTable().vm.$emit('onPageUpdate', 2);
    await flushPromises();
    vi.mocked(store.loadBeziehungen).mockClear();

    getResultTable().vm.$emit('onTableUpdate', {
      sortField: SortFieldOrganisationsbeziehung.AndereOrganisationName,
      sortOrder: 'desc',
    });
    await flushPromises();

    expect(store.loadBeziehungen).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      expect.objectContaining({
        offset: 0,
        sortField: SortFieldOrganisationsbeziehung.AndereOrganisationName,
        sortOrder: 'desc',
      }),
    );
  });

  test('it ignores table updates without a sort field', async () => {
    await openSection();
    vi.mocked(store.loadBeziehungen).mockClear();

    getResultTable().vm.$emit('onTableUpdate', { sortField: undefined, sortOrder: 'asc' });
    await flushPromises();

    expect(store.loadBeziehungen).not.toHaveBeenCalled();
  });
});
