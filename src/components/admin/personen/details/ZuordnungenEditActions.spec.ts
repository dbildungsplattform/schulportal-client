import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungenEditActions from './ZuordnungenEditActions.vue';

type EditActionsProps = {
  selectedCount: number;
  editableZuordnungenCount: number;
  isDeleteExternZuordnungDisabled: boolean;
  canChangeKlasse: boolean;
  hasKlassenZuordnung: boolean;
};

const configStore: ConfigStore = useConfigStore();

describe('ZuordnungenEditActions', () => {
  let wrapper: VueWrapper | null = null;

  function mountComponent(props: Partial<EditActionsProps> = {}): VueWrapper {
    wrapper = mount(ZuordnungenEditActions, {
      props: {
        selectedCount: 0,
        editableZuordnungenCount: 2,
        isDeleteExternZuordnungDisabled: false,
        canChangeKlasse: false,
        hasKlassenZuordnung: false,
        ...props,
      },
      global: {
        stubs: { PersonenkontextDelete: true },
      },
    });
    return wrapper;
  }

  function enableFeatureFlags(): void {
    configStore.configData = {
      rolleBearbeitenEnabled: true,
      befristungBearbeitenEnabled: true,
      rolleErweiternEnabled: true,
      setUemPasswordEnabled: true,
      schulischeAngeboteErstellen: true,
    };
  }

  function emitFromChild(componentName: string, eventName: string, ...args: unknown[]): void {
    const child: unknown = wrapper!.findComponent({ name: componentName }).vm;
    (child as { $emit: (event: string, ...payload: unknown[]) => void }).$emit(eventName, ...args);
  }

  function isDisabled(testId: string): boolean {
    return wrapper!.get(`[data-testid="${testId}"]`).attributes('disabled') !== undefined;
  }

  // The tooltip that wraps the element with the given data-testid
  function getTooltipProps(testId: string): Record<string, unknown> {
    const tooltip: VueWrapper | undefined = wrapper!
      .findAllComponents({ name: 'SpshTooltip' })
      .find((candidate: VueWrapper): boolean => candidate.find(`[data-testid="${testId}"]`).exists());
    return tooltip?.props() ?? {};
  }

  beforeEach(() => {
    configStore.configData = null;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  describe('add button', () => {
    test('it emits add while no Zuordnung is selected', async () => {
      mountComponent({ selectedCount: 0 });

      expect(isDisabled('zuordnung-create-button')).toBe(false);
      expect(getTooltipProps('zuordnung-create-button')).toMatchObject({
        enabledCondition: true,
        enabledText: 'Schulzuordnung hinzufügen',
        disabledText: 'Diese Aktion ist nach Auswahl einer Schulzuordnung nicht ausführbar.',
      });

      await wrapper!.get('[data-testid="zuordnung-create-button"]').trigger('click');

      expect(wrapper!.emitted('add')).toHaveLength(1);
    });

    test('it is disabled as soon as a Zuordnung is selected', async () => {
      mountComponent({ selectedCount: 1 });

      expect(isDisabled('zuordnung-create-button')).toBe(true);
      expect(getTooltipProps('zuordnung-create-button')).toMatchObject({ enabledCondition: false });

      await wrapper!.get('[data-testid="zuordnung-create-button"]').trigger('click');

      expect(wrapper!.emitted('add')).toBeUndefined();
    });
  });

  describe('delete button', () => {
    test.each([
      { selectedCount: 0, isDeleteExternZuordnungDisabled: false, disabled: true, disabledTooltipText: undefined },
      { selectedCount: 1, isDeleteExternZuordnungDisabled: false, disabled: false, disabledTooltipText: undefined },
      { selectedCount: 1, isDeleteExternZuordnungDisabled: true, disabled: true, disabledTooltipText: '' },
    ])(
      'it passes disabled=$disabled and tooltip text "$disabledTooltipText" for selection=$selectedCount and extern deletion disabled=$isDeleteExternZuordnungDisabled',
      ({
        selectedCount,
        isDeleteExternZuordnungDisabled,
        disabled,
        disabledTooltipText,
      }: Pick<EditActionsProps, 'selectedCount' | 'isDeleteExternZuordnungDisabled'> & {
        disabled: boolean;
        disabledTooltipText: string | undefined;
      }) => {
        mountComponent({ selectedCount, isDeleteExternZuordnungDisabled, editableZuordnungenCount: 3 });

        expect(wrapper!.findComponent({ name: 'PersonenkontextDelete' }).props()).toMatchObject({
          disabled,
          disabledTooltipText,
          zuordnungCount: 3,
        });
      },
    );

    test('it emits delete when the deletion is confirmed', () => {
      mountComponent({ selectedCount: 1 });

      emitFromChild('PersonenkontextDelete', 'onDeletePersonenkontext');

      expect(wrapper!.emitted('delete')).toHaveLength(1);
    });
  });

  describe('feature flags', () => {
    test('it hides the Rolle and Befristung buttons when the features are not enabled', () => {
      mountComponent({ selectedCount: 1 });

      expect(wrapper!.find('[data-testid="rolle-change-button"]').exists()).toBe(false);
      expect(wrapper!.find('[data-testid="befristung-change-button"]').exists()).toBe(false);
    });

    test('it hides the Befristung button when only the Rolle feature is enabled', () => {
      configStore.configData = {
        rolleBearbeitenEnabled: true,
        befristungBearbeitenEnabled: false,
        rolleErweiternEnabled: false,
        setUemPasswordEnabled: false,
        schulischeAngeboteErstellen: false,
      };
      mountComponent({ selectedCount: 1 });

      expect(wrapper!.find('[data-testid="rolle-change-button"]').exists()).toBe(true);
      expect(wrapper!.find('[data-testid="befristung-change-button"]').exists()).toBe(false);
    });

    test('it disables the Rolle button without a selection', () => {
      enableFeatureFlags();
      mountComponent({ selectedCount: 0 });

      expect(isDisabled('rolle-change-button')).toBe(true);
      expect(getTooltipProps('rolle-change-button')).toMatchObject({
        enabledCondition: false,
        disabledText: 'Wählen Sie bitte zuerst eine Schulzuordnung aus.',
        enabledText: 'Ändert die Rolle des Benutzers an der Schule ohne ihn zu entfernen.',
      });
    });

    test('it enables the Rolle button with a selection', () => {
      enableFeatureFlags();
      mountComponent({ selectedCount: 2 });

      expect(isDisabled('rolle-change-button')).toBe(false);
      expect(getTooltipProps('rolle-change-button')).toMatchObject({ enabledCondition: true });
    });
  });

  describe('Befristung button', () => {
    test.each([0, 2])('it is disabled when %i Zuordnungen are selected', async (selectedCount: number) => {
      enableFeatureFlags();
      mountComponent({ selectedCount });

      expect(isDisabled('befristung-change-button')).toBe(true);

      await wrapper!.get('[data-testid="befristung-change-button"]').trigger('click');

      expect(wrapper!.emitted('changeBefristung')).toBeUndefined();
    });

    test('it emits changeBefristung when exactly one Zuordnung is selected', async () => {
      enableFeatureFlags();
      mountComponent({ selectedCount: 1 });

      expect(isDisabled('befristung-change-button')).toBe(false);
      expect(getTooltipProps('befristung-change-button')).toMatchObject({
        enabledCondition: true,
        enabledText: 'Ändert die Befristung der Zuordnung des Benutzers zu dieser Schule.',
      });

      await wrapper!.get('[data-testid="befristung-change-button"]').trigger('click');

      expect(wrapper!.emitted('changeBefristung')).toHaveLength(1);
    });
  });

  describe('Klasse button', () => {
    test('it is not rendered without a Klassen-Zuordnung', () => {
      mountComponent({ hasKlassenZuordnung: false, canChangeKlasse: true });

      expect(wrapper!.find('[data-testid="klasse-change-button"]').exists()).toBe(false);
    });

    test('it is disabled when the Klasse cannot be changed', async () => {
      mountComponent({ hasKlassenZuordnung: true, canChangeKlasse: false });

      expect(isDisabled('klasse-change-button')).toBe(true);
      expect(getTooltipProps('klasse-change-button')).toMatchObject({
        enabledCondition: false,
        disabledText: 'Wählen Sie bitte zunächst eine Schulzuordnung mit einer Klasse aus.',
      });

      await wrapper!.get('[data-testid="klasse-change-button"]').trigger('click');

      expect(wrapper!.emitted('changeKlasse')).toBeUndefined();
    });

    test('it emits changeKlasse when the Klasse can be changed', async () => {
      mountComponent({ hasKlassenZuordnung: true, canChangeKlasse: true });

      expect(isDisabled('klasse-change-button')).toBe(false);
      expect(wrapper!.get('[data-testid="klasse-change-button"]').text()).toBe('Versetzen');

      await wrapper!.get('[data-testid="klasse-change-button"]').trigger('click');

      expect(wrapper!.emitted('changeKlasse')).toHaveLength(1);
    });
  });
});
