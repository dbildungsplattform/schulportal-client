import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { mount, type VueWrapper } from '@vue/test-utils';
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

const NO_ZUORDNUNGEN_TEXT: string = 'Keine Schulzuordnungen gefunden.';

describe('ZuordnungenEditOverview', () => {
  const firstZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
  const secondZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung();
  const zuordnungen: ZuordnungWithKlasse[] = [firstZuordnung, secondZuordnung];
  let wrapper: VueWrapper | null = null;

  function mountComponent(props: Partial<EditOverviewProps> = {}): VueWrapper {
    wrapper = mount(ZuordnungenEditOverview, {
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
    });
    return wrapper;
  }

  function emitFromChild(componentName: string, eventName: string, ...args: unknown[]): void {
    const child: unknown = wrapper!.findComponent({ name: componentName }).vm;
    (child as { $emit: (event: string, ...payload: unknown[]) => void }).$emit(eventName, ...args);
  }

  function isDisabled(testId: string): boolean {
    return wrapper!.get(`[data-testid="${testId}"]`).attributes('disabled') !== undefined;
  }

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  describe('without a pending operation', () => {
    test('it asks to select Zuordnungen and shows the list and the actions', () => {
      mountComponent();

      expect(wrapper!.text()).toContain('Schulzuordnungen bearbeiten: Bitte auswählen');
      expect(wrapper!.find('[data-testid="check-and-save-headline"]').exists()).toBe(false);
      expect(wrapper!.findComponent({ name: 'ZuordnungenEditActions' }).exists()).toBe(true);
      for (const zuordnung of zuordnungen) {
        expect(wrapper!.find(`[data-testid="person-zuordnung-${zuordnung.sskId}"]`).exists()).toBe(true);
      }
    });

    test('it disables saving because there are no changes', async () => {
      mountComponent();

      expect(isDisabled('zuordnung-changes-save-button')).toBe(true);

      await wrapper!.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');

      expect(wrapper!.emitted('save')).toBeUndefined();
    });

    test('it passes the selection and the Zuordnungen to the actions', () => {
      mountComponent({
        selectedZuordnungen: [firstZuordnung],
        isDeleteExternZuordnungDisabled: true,
        canChangeKlasse: true,
        hasKlassenZuordnung: true,
      });

      expect(wrapper!.findComponent({ name: 'ZuordnungenEditActions' }).props()).toMatchObject({
        selectedCount: 1,
        editableZuordnungenCount: 2,
        isDeleteExternZuordnungDisabled: true,
        canChangeKlasse: true,
        hasKlassenZuordnung: true,
      });
    });

    test.each(['delete', 'add', 'changeBefristung', 'changeKlasse'] as const)(
      'it forwards the %s event of the actions',
      (eventName: 'delete' | 'add' | 'changeBefristung' | 'changeKlasse') => {
        mountComponent();

        emitFromChild('ZuordnungenEditActions', eventName);

        expect(wrapper!.emitted(eventName)).toHaveLength(1);
      },
    );

    test('it updates the selection when the list selects a Zuordnung', () => {
      mountComponent();

      emitFromChild('ZuordnungenEditList', 'update:selectedZuordnungen', [secondZuordnung]);

      expect(wrapper!.emitted('update:selectedZuordnungen')).toEqual([[[secondZuordnung]]]);
    });
  });

  describe('with a pending operation', () => {
    test('it asks to check and save and hides the actions', () => {
      mountComponent({ pendingOperation: 'changeBefristung' });

      expect(wrapper!.get('[data-testid="check-and-save-headline"]').text()).toBe(
        'Bitte prüfen und abschließend speichern, um die Aktion auszuführen:',
      );
      expect(wrapper!.text()).not.toContain('Bitte auswählen');
      expect(wrapper!.findComponent({ name: 'ZuordnungenEditActions' }).exists()).toBe(false);
    });

    test('it emits save when the pending change is saved', async () => {
      mountComponent({ pendingOperation: 'changeKlasse' });

      expect(isDisabled('zuordnung-changes-save-button')).toBe(false);

      await wrapper!.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');

      expect(wrapper!.emitted('save')).toHaveLength(1);
    });

    test('it disables saving while loading', async () => {
      mountComponent({ pendingOperation: 'changeKlasse', isLoading: true });

      expect(isDisabled('zuordnung-changes-save-button')).toBe(true);

      await wrapper!.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');

      expect(wrapper!.emitted('save')).toBeUndefined();
    });
  });

  describe('save tooltip', () => {
    test.each([
      [undefined, false],
      ['creation', true],
    ] as const)(
      'it reflects whether there is a pending operation (%s)',
      (pendingOperation: ZuordnungOperation | undefined, expectedCondition: boolean) => {
        mountComponent({ pendingOperation });

        const saveTooltip: VueWrapper | undefined = wrapper!
          .findAllComponents({ name: 'SpshTooltip' })
          .find((tooltip: VueWrapper): boolean =>
            tooltip.find('[data-testid="zuordnung-changes-save-button"]').exists(),
          );

        expect(saveTooltip?.props()).toMatchObject({
          enabledCondition: expectedCondition,
          enabledText: 'Änderungen speichern',
          disabledText: 'Es liegen keine zu speichernden Änderungen vor.',
        });
      },
    );
  });

  describe('hint for missing Zuordnungen', () => {
    test('it is shown when there are no Zuordnungen and no operation is pending', () => {
      mountComponent({ zuordnungen: [], hasNoZuordnungen: true });

      expect(wrapper!.text()).toContain(NO_ZUORDNUNGEN_TEXT);
    });

    test.each(['changeKlasse', 'changeBefristung'] as const)(
      'it is shown when there are no Zuordnungen and %s is pending',
      (pendingOperation: ZuordnungOperation) => {
        mountComponent({ zuordnungen: [], hasNoZuordnungen: true, pendingOperation });

        expect(wrapper!.text()).toContain(NO_ZUORDNUNGEN_TEXT);
      },
    );

    test.each(['creation', 'deletion'] as const)(
      'it is hidden when %s is pending',
      (pendingOperation: ZuordnungOperation) => {
        mountComponent({ zuordnungen: [], hasNoZuordnungen: true, pendingOperation });

        expect(wrapper!.text()).not.toContain(NO_ZUORDNUNGEN_TEXT);
      },
    );

    test('it is hidden when there are Zuordnungen', () => {
      mountComponent({ hasNoZuordnungen: false });

      expect(wrapper!.text()).not.toContain(NO_ZUORDNUNGEN_TEXT);
    });
  });

  test('it emits cancel', async () => {
    mountComponent();

    await wrapper!.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');

    expect(wrapper!.emitted('cancel')).toHaveLength(1);
  });
});
