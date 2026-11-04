import { mount, type VueWrapper } from '@vue/test-utils';
import OrganisationsbeziehungenFilter from './OrganisationsbeziehungenFilter.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
});

describe('OrganisationsbeziehungenFilter', () => {
  test('it renders the filter with the initial value', () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { initialValue: 'initial' } });

    expect(wrapper.find('[data-testid="organisationsbeziehungen-filter"]').exists()).toBe(true);
    expect(wrapper.get<HTMLInputElement>('[data-testid="search-filter-input"] input').element.value).toBe('initial');
  });

  test('it emits the trimmed search string when the search button is clicked', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter);

    await wrapper.get('[data-testid="search-filter-input"] input').setValue('  Schule  ');
    await wrapper.get('[data-testid="apply-search-filter-button"]').trigger('click');

    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Schule']]);
  });
});
