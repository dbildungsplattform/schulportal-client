import { mount, type VueWrapper } from '@vue/test-utils';
import { VTextField } from 'vuetify/components';
import OrganisationsbeziehungenFilter from './OrganisationsbeziehungenFilter.vue';

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});

function getTextField(): VueWrapper<InstanceType<typeof VTextField>> {
  return wrapper!.findComponent(VTextField);
}

describe('OrganisationsbeziehungenFilter', () => {
  test('it renders the filter with the initial value', () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { initialValue: 'initial' } });

    expect(wrapper.find('[data-testid="organisationsbeziehungen-filter"]').exists()).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('[data-testid="organisationsbeziehungen-filter-input"] input').element.value,
    ).toBe('initial');
  });

  test('it emits the trimmed search string only after the debounce when the user types', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter);

    await wrapper.get('[data-testid="organisationsbeziehungen-filter-input"] input').setValue('  Schule  ');
    await vi.advanceTimersByTimeAsync(499);
    expect(wrapper.emitted('onApplySearchFilter')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Schule']]);
  });

  test('it emits only the last search string when the user keeps typing', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter);
    const input: ReturnType<VueWrapper['get']> = wrapper.get(
      '[data-testid="organisationsbeziehungen-filter-input"] input',
    );

    await input.setValue('Sch');
    await vi.advanceTimersByTimeAsync(300);
    await input.setValue('Schule');
    await vi.advanceTimersByTimeAsync(500);

    expect(wrapper.emitted('onApplySearchFilter')).toEqual([['Schule']]);
  });

  test('it emits an empty search string when the filter is cleared', async () => {
    wrapper = mount(OrganisationsbeziehungenFilter, { props: { initialValue: 'initial' } });
    await vi.advanceTimersByTimeAsync(500);

    getTextField().vm.$emit('update:modelValue', null);
    await vi.advanceTimersByTimeAsync(500);

    expect(wrapper.emitted('onApplySearchFilter')?.at(-1)).toEqual(['']);
    expect(
      wrapper.get<HTMLInputElement>('[data-testid="organisationsbeziehungen-filter-input"] input').element.value,
    ).toBe('');
  });
});
