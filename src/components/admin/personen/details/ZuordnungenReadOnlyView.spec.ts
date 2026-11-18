import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { enableAutoUnmount, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import PersonenkontextItem from './PersonenkontextItem.vue';
import ZuordnungenReadOnlyView from './ZuordnungenReadOnlyView.vue';

type ReadOnlyViewProps = {
  loading: boolean;
  zuordnungen: ZuordnungWithKlasse[] | undefined;
  hasZuordnungen: boolean;
  hasSelection: boolean;
  isEditPersonMetadataActive: boolean;
};

type ReadOnlyViewSetup = {
  wrapper: VueWrapper<InstanceType<typeof ZuordnungenReadOnlyView>>;
  zuordnungen: ZuordnungWithKlasse[];
};

describe('ZuordnungenReadOnlyView', () => {
  enableAutoUnmount(afterEach);

  const setup = (props: Partial<ReadOnlyViewProps> = {}): ReadOnlyViewSetup => {
    const zuordnungen: ZuordnungWithKlasse[] = [DoFactory.getZuordnung(), DoFactory.getZuordnung()];
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungenReadOnlyView>> = mount(ZuordnungenReadOnlyView, {
      props: {
        loading: false,
        zuordnungen,
        hasZuordnungen: true,
        hasSelection: false,
        isEditPersonMetadataActive: false,
        ...props,
      },
      global: {
        stubs: { PersonenkontextItem: true },
      },
    });
    return { wrapper, zuordnungen };
  };

  test('it only shows a progress indicator while loading', () => {
    const { wrapper }: ReturnType<typeof setup> = setup({ loading: true });

    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(true);
    expect(wrapper.find('[data-testid="zuordnungen-section-headline"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="zuordnung-edit-button"]').exists()).toBe(false);
  });

  test('it lists every Zuordnung with its Schule as title', () => {
    const { wrapper, zuordnungen }: ReturnType<typeof setup> = setup();

    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(false);
    expect(wrapper.get('[data-testid="zuordnungen-section-headline"]').text()).toBe('Schulzuordnung(en)');
    expect(wrapper.text()).not.toContain('Keine Schulzuordnungen gefunden.');

    expect(wrapper.findAllComponents({ name: 'PersonenkontextItem' })).toHaveLength(zuordnungen.length);
    wrapper
      .findAllComponents(PersonenkontextItem)
      .forEach((item: VueWrapper<InstanceType<typeof PersonenkontextItem>>, index: number): void => {
        const zuordnung: ZuordnungWithKlasse = zuordnungen[index]!;
        expect(item.props()).toMatchObject({ zuordnung, noMargin: true });
        expect(wrapper.get(`[data-testid="person-zuordnung-${zuordnung.sskId}"]`).attributes('title')).toBe(
          zuordnung.sskName,
        );
      });
  });

  test('it shows a hint when there are no Zuordnungen', () => {
    const { wrapper }: ReturnType<typeof setup> = setup({ zuordnungen: [], hasZuordnungen: false });

    expect(wrapper.text()).toContain('Keine Schulzuordnungen gefunden.');
    expect(wrapper.findComponent({ name: 'PersonenkontextItem' }).exists()).toBe(false);
  });

  test('it emits edit when the edit button is clicked', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup();

    const editButton: Omit<DOMWrapper<Element>, 'exists'> = wrapper.get('[data-testid="zuordnung-edit-button"]');
    expect(editButton.attributes('disabled')).toBeUndefined();
    expect(editButton.text()).toBe('Bearbeiten');

    await editButton.trigger('click');

    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  test('it disables the edit button while the person metadata is edited', () => {
    const { wrapper }: ReturnType<typeof setup> = setup({ isEditPersonMetadataActive: true });

    expect(wrapper.get('[data-testid="zuordnung-edit-button"]').attributes('disabled')).toBeDefined();
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
      const { wrapper }: ReturnType<typeof setup> = setup({ hasSelection, isEditPersonMetadataActive });

      expect(wrapper.findComponent({ name: 'SpshTooltip' }).props()).toMatchObject({
        enabledCondition: expectedCondition,
        enabledText: 'Schulzuordnungen bearbeiten',
        disabledText: 'Bitte beenden Sie zunächst Ihre aktuelle Bearbeitung.',
      });
    },
  );
});
