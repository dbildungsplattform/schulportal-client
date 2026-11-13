import type { OrganisationsbeziehungOrganisationResponse } from '@/api-client/generated/api';
import { mount, type VueWrapper } from '@vue/test-utils';
import OrganisationsbeziehungenFilter from './OrganisationsbeziehungenFilter.vue';

let wrapper: VueWrapper | null = null;

const schule: OrganisationsbeziehungOrganisationResponse = {
  id: 'org-1',
  name: 'Grundschule',
  dienststellennummer: '1234567',
};
const traeger: OrganisationsbeziehungOrganisationResponse = { id: 'org-2', name: 'Schulträger', dienststellennummer: null };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});

function getAutocomplete(): VueWrapper {
  return wrapper!.findComponent({ name: 'VAutocomplete' });
}

describe('OrganisationsbeziehungenFilter', () => {
  test('it renders the autocomplete with the given items', () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule, traeger] } });

    expect(wrapper.find('[data-testid="organisationsbeziehungen-filter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="organisationsbeziehungen-filter-select"]').exists()).toBe(true);
    expect(getAutocomplete().props('items')).toEqual([schule, traeger]);
  });

  test('it dedups items that appear in several rows', () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule, schule, traeger] } });

    expect(getAutocomplete().props('items')).toEqual([schule, traeger]);
  });

  test('it emits the trimmed search string after the debounce when the user types', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter);

    getAutocomplete().vm.$emit('update:search', '  Schule  ');
    await vi.advanceTimersByTimeAsync(499);
    expect(wrapper.emitted('onApplySearchFilter')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Schule']]);
  });

  test('it emits the name of the selected organisation', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule, traeger] } });

    getAutocomplete().vm.$emit('update:modelValue', schule);
    await vi.advanceTimersByTimeAsync(0);

    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Grundschule']]);
  });

  test('it keeps the selection as item when the loaded rows no longer contain it', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule, traeger] } });

    getAutocomplete().vm.$emit('update:modelValue', schule);
    await wrapper.setProps({ items: [traeger] });

    expect(getAutocomplete().props('items')).toEqual([schule, traeger]);
  });

  test('it prefers the typed text over the selection', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule] } });
    getAutocomplete().vm.$emit('update:modelValue', schule);
    await vi.advanceTimersByTimeAsync(0);

    getAutocomplete().vm.$emit('update:search', 'Träger');
    await vi.advanceTimersByTimeAsync(500);

    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Grundschule'], ['Träger']]);
  });

  test('it keeps filtering by the selection when the autocomplete clears its search text', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule] } });
    getAutocomplete().vm.$emit('update:modelValue', schule);
    getAutocomplete().vm.$emit('update:search', 'Grund');
    await vi.advanceTimersByTimeAsync(500);
    getAutocomplete().vm.$emit('update:search', '');
    await vi.advanceTimersByTimeAsync(500);

    expect(wrapper.emitted('onApplySearchFilter')?.at(-1)).toEqual(['Grundschule']);
  });

  test('it emits an empty search string when the selection is reset', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { items: [schule] } });
    getAutocomplete().vm.$emit('update:modelValue', schule);
    await vi.advanceTimersByTimeAsync(0);

    getAutocomplete().vm.$emit('update:modelValue', null);
    await vi.advanceTimersByTimeAsync(0);

    expect(wrapper.emitted('onApplySearchFilter')?.at(-1)).toEqual(['']);
  });

  test('it uses the initial value as the search text', () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { initialValue: 'initial' } });

    expect(getAutocomplete().props('search')).toBe('initial');
  });
});
