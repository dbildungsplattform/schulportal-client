import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import ZuordnungenEditOverview from './ZuordnungenEditOverview.vue';

type EditOverviewProps = {
  zuordnungen: ZuordnungWithKlasse[];
  newZuordnung: ZuordnungWithKlasse | undefined;
  pendingOperation: ZuordnungOperation | undefined;
  hasNoZuordnungen: boolean;
  isDeleteExternZuordnungDisabled: boolean;
  canChangeKlasse: boolean;
  hasKlassenZuordnung: boolean;
  isLoading: boolean;
  selectedZuordnungen: ZuordnungWithKlasse[];
};

type EditOverviewSetup = {
  wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditOverview>>;
  firstZuordnung: ZuordnungWithKlasse;
  secondZuordnung: ZuordnungWithKlasse;
  zuordnungen: ZuordnungWithKlasse[];
  emitFromChild: (componentName: string, eventName: string, ...args: unknown[]) => void;
  isDisabled: (testId: string) => boolean;
};

const NO_ZUORDNUNGEN_TEXT: string = 'Keine Schulzuordnungen gefunden.';

describe('ZuordnungenEditOverview', () => {
  enableAutoUnmount(afterEach);

  const setup = (
    props: Partial<EditOverviewProps> = {},
    fixtures: { firstZuordnung: ZuordnungWithKlasse; secondZuordnung: ZuordnungWithKlasse } = {
      firstZuordnung: DoFactory.getZuordnung(),
      secondZuordnung: DoFactory.getZuordnung(),
    },
  ): EditOverviewSetup => {
    const { firstZuordnung, secondZuordnung }: typeof fixtures = fixtures;
    const zuordnungen: ZuordnungWithKlasse[] = [firstZuordnung, secondZuordnung];
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditOverview>> = mount(ZuordnungenEditOverview, {
      props: {
        zuordnungen,
        newZuordnung: undefined,
        pendingOperation: undefined,
        hasNoZuordnungen: false,
        isDeleteExternZuordnungDisabled: false,
        canChangeKlasse: false,
        hasKlassenZuordnung: false,
        isLoading: false,
        selectedZuordnungen: [],
        ...props,
      },
      global: {
        stubs: { ZuordnungenEditList: true, ZuordnungenEditActions: true },
      },
    });
    const emitFromChild = (componentName: string, eventName: string, ...args: unknown[]): void => {
      const child: unknown = wrapper.findComponent({ name: componentName }).vm;
      (child as { $emit: (event: string, ...payload: unknown[]) => void }).$emit(eventName, ...args);
    };

    const isDisabled = (testId: string): boolean =>
      wrapper.get(`[data-testid="${testId}"]`).attributes('disabled') !== undefined;

    return { wrapper, firstZuordnung, secondZuordnung, zuordnungen, emitFromChild, isDisabled };
  };

  describe('without a pending operation', () => {
    test('it asks to select Zuordnungen and shows the actions', () => {
      const { wrapper }: EditOverviewSetup = setup();

      expect(wrapper.text()).toContain('Schulzuordnungen bearbeiten: Bitte auswählen');
      expect(wrapper.find('[data-testid="check-and-save-headline"]').exists()).toBe(false);
      expect(wrapper.findComponent({ name: 'ZuordnungenEditActions' }).exists()).toBe(true);
    });

    test('it disables saving and explains that there are no changes', () => {
      const { wrapper, isDisabled }: EditOverviewSetup = setup();

      expect(isDisabled('zuordnung-changes-save-button')).toBe(true);
      expect(wrapper.findComponent({ name: 'SpshTooltip' }).props()).toMatchObject({
        enabledCondition: false,
        enabledText: 'Änderungen speichern',
        disabledText: 'Es liegen keine zu speichernden Änderungen vor.',
      });
    });

    test('it passes the selection and the Zuordnungen to the actions', () => {
      const firstZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
      const { wrapper }: EditOverviewSetup = setup(
        {
          selectedZuordnungen: [firstZuordnung],
          isDeleteExternZuordnungDisabled: true,
          canChangeKlasse: true,
          hasKlassenZuordnung: true,
        },
        { firstZuordnung, secondZuordnung: DoFactory.getZuordnung() },
      );

      expect(wrapper.findComponent({ name: 'ZuordnungenEditActions' }).props()).toMatchObject({
        selectedCount: 1,
        editableZuordnungenCount: 2,
        isDeleteExternZuordnungDisabled: true,
        canChangeKlasse: true,
        hasKlassenZuordnung: true,
      });
    });

    const expectEventForwarded = (eventName: 'delete' | 'add' | 'changeBefristung' | 'changeKlasse'): void => {
      const { wrapper, emitFromChild }: EditOverviewSetup = setup();

      emitFromChild('ZuordnungenEditActions', eventName);

      expect(wrapper.emitted(eventName)).toHaveLength(1);
    };

    describe('delete event of the actions', () => {
      test('it is forwarded', () => {
        expectEventForwarded('delete');
      });
    });

    describe('add event of the actions', () => {
      test('it is forwarded', () => {
        expectEventForwarded('add');
      });
    });

    describe('changeBefristung event of the actions', () => {
      test('it is forwarded', () => {
        expectEventForwarded('changeBefristung');
      });
    });

    describe('changeKlasse event of the actions', () => {
      test('it is forwarded', () => {
        expectEventForwarded('changeKlasse');
      });
    });
  });

  describe('list', () => {
    test('it receives the Zuordnungen, the new Zuordnung, the pending operation and the selection', () => {
      const firstZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
      const secondZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
      const { wrapper, zuordnungen }: EditOverviewSetup = setup(
        {
          newZuordnung: secondZuordnung,
          pendingOperation: 'creation',
          selectedZuordnungen: [firstZuordnung],
        },
        { firstZuordnung, secondZuordnung },
      );

      expect(wrapper.findComponent({ name: 'ZuordnungenEditList' }).props()).toMatchObject({
        zuordnungen,
        newZuordnung: secondZuordnung,
        pendingOperation: 'creation',
        selectedZuordnungen: [firstZuordnung],
      });
    });

    test('it updates the selection when the list selects a Zuordnung', () => {
      const firstZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
      const secondZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
      const { wrapper, emitFromChild }: EditOverviewSetup = setup({}, { firstZuordnung, secondZuordnung });

      emitFromChild('ZuordnungenEditList', 'update:selectedZuordnungen', [secondZuordnung]);

      expect(wrapper.emitted('update:selectedZuordnungen')).toEqual([[[secondZuordnung]]]);
    });
  });

  describe('with a pending operation', () => {
    test('it asks to check and save and hides the actions', () => {
      const { wrapper }: EditOverviewSetup = setup({ pendingOperation: 'changeBefristung' });

      expect(wrapper.get('[data-testid="check-and-save-headline"]').text()).toBe(
        'Bitte prüfen und abschließend speichern, um die Aktion auszuführen:',
      );
      expect(wrapper.text()).not.toContain('Bitte auswählen');
      expect(wrapper.findComponent({ name: 'ZuordnungenEditActions' }).exists()).toBe(false);
    });

    test('it enables saving and emits save', async () => {
      const { wrapper, isDisabled }: EditOverviewSetup = setup({ pendingOperation: 'changeKlasse' });

      expect(isDisabled('zuordnung-changes-save-button')).toBe(false);
      expect(wrapper.findComponent({ name: 'SpshTooltip' }).props('enabledCondition')).toBe(true);

      await wrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');

      expect(wrapper.emitted('save')).toHaveLength(1);
    });

    test('it disables saving while loading', () => {
      const { isDisabled }: EditOverviewSetup = setup({ pendingOperation: 'changeKlasse', isLoading: true });

      expect(isDisabled('zuordnung-changes-save-button')).toBe(true);
    });
  });

  describe('hint for missing Zuordnungen', () => {
    test('it is shown when there are no Zuordnungen and no operation is pending', () => {
      const { wrapper }: EditOverviewSetup = setup({ zuordnungen: [], hasNoZuordnungen: true });

      expect(wrapper.text()).toContain(NO_ZUORDNUNGEN_TEXT);
    });

    const isHintShownWhilePending = (pendingOperation: ZuordnungOperation): boolean => {
      const { wrapper }: EditOverviewSetup = setup({
        zuordnungen: [],
        hasNoZuordnungen: true,
        pendingOperation,
      });

      return wrapper.text().includes(NO_ZUORDNUNGEN_TEXT);
    };

    describe('when there are no Zuordnungen and changeKlasse is pending', () => {
      test('it is shown', () => {
        expect(isHintShownWhilePending('changeKlasse')).toBe(true);
      });
    });

    describe('when there are no Zuordnungen and changeBefristung is pending', () => {
      test('it is shown', () => {
        expect(isHintShownWhilePending('changeBefristung')).toBe(true);
      });
    });

    describe('when creation is pending', () => {
      test('it is hidden', () => {
        expect(isHintShownWhilePending('creation')).toBe(false);
      });
    });

    describe('when deletion is pending', () => {
      test('it is hidden', () => {
        expect(isHintShownWhilePending('deletion')).toBe(false);
      });
    });

    test('it is hidden when there are Zuordnungen', () => {
      const { wrapper }: EditOverviewSetup = setup({ hasNoZuordnungen: false });

      expect(wrapper.text()).not.toContain(NO_ZUORDNUNGEN_TEXT);
    });
  });

  test('it emits cancel', async () => {
    const { wrapper }: EditOverviewSetup = setup();

    await wrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
