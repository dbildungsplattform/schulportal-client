import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import ZuordnungenReadOnlyView from './ZuordnungenReadOnlyView.vue';

type ReadOnlyViewProps = {
  loading: boolean;
  zuordnungen: ZuordnungWithKlasse[] | undefined;
  hasZuordnungen: boolean;
  hasSelection: boolean;
  isEditPersonMetadataActive: boolean;
};

describe('ZuordnungenReadOnlyView', () => {
  const zuordnungen: ZuordnungWithKlasse[] = [DoFactory.getZuordnung(), DoFactory.getZuordnung()];
  let wrapper: VueWrapper | null = null;

  function mountComponent(props: Partial<ReadOnlyViewProps> = {}): VueWrapper {
    wrapper = mount(ZuordnungenReadOnlyView, {
      props: {
        loading: false,
        zuordnungen,
        hasZuordnungen: true,
        hasSelection: false,
        isEditPersonMetadataActive: false,
        ...props,
      },
    });
    return wrapper;
  }

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it only shows a progress indicator while loading', () => {
    mountComponent({ loading: true });

    expect(wrapper!.findComponent({ name: 'VProgressCircular' }).exists()).toBe(true);
    expect(wrapper!.find('[data-testid="zuordnungen-section-headline"]').exists()).toBe(false);
    expect(wrapper!.find('[data-testid="zuordnung-edit-button"]').exists()).toBe(false);
  });

  test('it lists every Zuordnung with its Schule as title', () => {
    mountComponent();

    expect(wrapper!.findComponent({ name: 'VProgressCircular' }).exists()).toBe(false);
    expect(wrapper!.get('[data-testid="zuordnungen-section-headline"]').text()).toBe('Schulzuordnung(en)');
    expect(wrapper!.findAllComponents({ name: 'PersonenkontextItem' })).toHaveLength(2);
    for (const zuordnung of zuordnungen) {
      const row: ReturnType<VueWrapper['get']> = wrapper!.get(`[data-testid="person-zuordnung-${zuordnung.sskId}"]`);
      expect(row.attributes('title')).toBe(zuordnung.sskName);
      expect(row.text()).toContain(zuordnung.rolle);
    }
    expect(wrapper!.text()).not.toContain('Keine Schulzuordnungen gefunden.');
  });

  test('it shows a hint when there are no Zuordnungen', () => {
    mountComponent({ zuordnungen: [], hasZuordnungen: false });

    expect(wrapper!.text()).toContain('Keine Schulzuordnungen gefunden.');
    expect(wrapper!.findComponent({ name: 'PersonenkontextItem' }).exists()).toBe(false);
  });

  test('it emits edit when the edit button is clicked', async () => {
    mountComponent();

    const editButton: ReturnType<VueWrapper['get']> = wrapper!.get('[data-testid="zuordnung-edit-button"]');
    expect(editButton.attributes('disabled')).toBeUndefined();
    expect(editButton.text()).toBe('Bearbeiten');

    await editButton.trigger('click');

    expect(wrapper!.emitted('edit')).toHaveLength(1);
  });

  test('it disables the edit button while the person metadata is edited', async () => {
    mountComponent({ isEditPersonMetadataActive: true });

    const editButton: ReturnType<VueWrapper['get']> = wrapper!.get('[data-testid="zuordnung-edit-button"]');
    expect(editButton.attributes('disabled')).toBeDefined();

    await editButton.trigger('click');

    expect(wrapper!.emitted('edit')).toBeUndefined();
  });

  test.each([
    { hasSelection: false, isEditPersonMetadataActive: false, expectedCondition: true },
    { hasSelection: true, isEditPersonMetadataActive: false, expectedCondition: false },
    { hasSelection: false, isEditPersonMetadataActive: true, expectedCondition: false },
  ])(
    'it computes the tooltip condition for selection=$hasSelection and metadata editing=$isEditPersonMetadataActive',
    ({
      hasSelection,
      isEditPersonMetadataActive,
      expectedCondition,
    }: Pick<ReadOnlyViewProps, 'hasSelection' | 'isEditPersonMetadataActive'> & { expectedCondition: boolean }) => {
      mountComponent({ hasSelection, isEditPersonMetadataActive });

      expect(wrapper!.findComponent({ name: 'SpshTooltip' }).props()).toMatchObject({
        enabledCondition: expectedCondition,
        enabledText: 'Schulzuordnungen bearbeiten',
        disabledText: 'Bitte beenden Sie zunächst Ihre aktuelle Bearbeitung.',
      });
    },
  );
});
