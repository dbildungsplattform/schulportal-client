import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import ZuordnungenEditActions from './ZuordnungenEditActions.vue';

type EditActionsProps = {
  selectedCount: number;
  editableZuordnungenCount: number;
  isDeleteExternZuordnungDisabled: boolean;
  canChangeKlasse: boolean;
  hasKlassenZuordnung: boolean;
};

type EditActionsSetup = {
  wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditActions>>;
  configStore: ConfigStore;
  enableFeatureFlags: () => Promise<void>;
  emitFromChild: (componentName: string, eventName: string, ...args: unknown[]) => void;
  isDisabled: (testId: string) => boolean;
  getTooltipProps: (testId: string) => Record<string, unknown>;
};

describe('ZuordnungenEditActions', () => {
  enableAutoUnmount(afterEach);

  const setup = (props: Partial<EditActionsProps> = {}): EditActionsSetup => {
    const configStore: ConfigStore = useConfigStore();
    configStore.configData = null;
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditActions>> = mount(ZuordnungenEditActions, {
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
    const enableFeatureFlags = async (): Promise<void> => {
      configStore.configData = {
        rolleBearbeitenEnabled: true,
        befristungBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      await nextTick();
    };

    const emitFromChild = (componentName: string, eventName: string, ...args: unknown[]): void => {
      const child: unknown = wrapper.findComponent({ name: componentName }).vm;
      (child as { $emit: (event: string, ...payload: unknown[]) => void }).$emit(eventName, ...args);
    };

    const isDisabled = (testId: string): boolean =>
      wrapper.get(`[data-testid="${testId}"]`).attributes('disabled') !== undefined;

    const getTooltipProps = (testId: string): Record<string, unknown> => {
      const tooltip: VueWrapper | undefined = wrapper
        .findAllComponents({ name: 'SpshTooltip' })
        .find((candidate: VueWrapper): boolean => candidate.find(`[data-testid="${testId}"]`).exists());
      return tooltip?.props() ?? {};
    };

    return { wrapper, configStore, enableFeatureFlags, emitFromChild, isDisabled, getTooltipProps };
  };

  describe('add button', () => {
    test('it emits add while no Zuordnung is selected', async () => {
      const { wrapper, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({ selectedCount: 0 });

      expect(isDisabled('zuordnung-create-button')).toBe(false);
      expect(getTooltipProps('zuordnung-create-button')).toMatchObject({
        enabledCondition: true,
        enabledText: 'Schulzuordnung hinzufügen',
        disabledText: 'Diese Aktion ist nach Auswahl einer Schulzuordnung nicht ausführbar.',
      });

      await wrapper.get('[data-testid="zuordnung-create-button"]').trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(1);
    });

    test('it is disabled as soon as a Zuordnung is selected', async () => {
      const { wrapper, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({ selectedCount: 1 });

      expect(isDisabled('zuordnung-create-button')).toBe(true);
      expect(getTooltipProps('zuordnung-create-button')).toMatchObject({ enabledCondition: false });

      await wrapper.get('[data-testid="zuordnung-create-button"]').trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
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
        const { wrapper }: ReturnType<typeof setup> = setup({
          selectedCount,
          isDeleteExternZuordnungDisabled,
          editableZuordnungenCount: 3,
        });

        expect(wrapper.findComponent({ name: 'PersonenkontextDelete' }).props()).toMatchObject({
          disabled,
          disabledTooltipText,
          zuordnungCount: 3,
        });
      },
    );

    test('it emits delete when the deletion is confirmed', () => {
      const { wrapper, emitFromChild }: ReturnType<typeof setup> = setup({ selectedCount: 1 });

      emitFromChild('PersonenkontextDelete', 'onDeletePersonenkontext');

      expect(wrapper.emitted('delete')).toHaveLength(1);
    });
  });

  describe('feature flags', () => {
    test('it hides the Rolle and Befristung buttons when the features are not enabled', () => {
      const { wrapper }: ReturnType<typeof setup> = setup({ selectedCount: 1 });

      expect(wrapper.find('[data-testid="rolle-change-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="befristung-change-button"]').exists()).toBe(false);
    });

    test('it hides the Befristung button when only the Rolle feature is enabled', async () => {
      const { wrapper, configStore }: ReturnType<typeof setup> = setup({ selectedCount: 1 });
      configStore.configData = {
        rolleBearbeitenEnabled: true,
        befristungBearbeitenEnabled: false,
        rolleErweiternEnabled: false,
        setUemPasswordEnabled: false,
        schulischeAngeboteErstellen: false,
      };
      await nextTick();
      expect(wrapper.find('[data-testid="rolle-change-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="befristung-change-button"]').exists()).toBe(false);
    });

    test('it disables the Rolle button without a selection', async () => {
      const { enableFeatureFlags, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({ selectedCount: 0 });
      await enableFeatureFlags();

      expect(isDisabled('rolle-change-button')).toBe(true);
      expect(getTooltipProps('rolle-change-button')).toMatchObject({
        enabledCondition: false,
        disabledText: 'Wählen Sie bitte zuerst eine Schulzuordnung aus.',
        enabledText: 'Ändert die Rolle des Benutzers an der Schule ohne ihn zu entfernen.',
      });
    });

    test('it enables the Rolle button with a selection', async () => {
      const { enableFeatureFlags, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({ selectedCount: 2 });
      await enableFeatureFlags();

      expect(isDisabled('rolle-change-button')).toBe(false);
      expect(getTooltipProps('rolle-change-button')).toMatchObject({ enabledCondition: true });
    });
  });

  describe('Befristung button', () => {
    test.each([0, 2])('it is disabled when %i Zuordnungen are selected', async (selectedCount: number) => {
      const { wrapper, enableFeatureFlags, isDisabled }: ReturnType<typeof setup> = setup({ selectedCount });
      await enableFeatureFlags();

      expect(isDisabled('befristung-change-button')).toBe(true);

      await wrapper.get('[data-testid="befristung-change-button"]').trigger('click');

      expect(wrapper.emitted('changeBefristung')).toBeUndefined();
    });

    test('it emits changeBefristung when exactly one Zuordnung is selected', async () => {
      const { wrapper, enableFeatureFlags, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({
        selectedCount: 1,
      });
      await enableFeatureFlags();

      expect(isDisabled('befristung-change-button')).toBe(false);
      expect(getTooltipProps('befristung-change-button')).toMatchObject({
        enabledCondition: true,
        enabledText: 'Ändert die Befristung der Zuordnung des Benutzers zu dieser Schule.',
      });

      await wrapper.get('[data-testid="befristung-change-button"]').trigger('click');

      expect(wrapper.emitted('changeBefristung')).toHaveLength(1);
    });
  });

  describe('Klasse button', () => {
    test('it is not rendered without a Klassen-Zuordnung', () => {
      const { wrapper }: ReturnType<typeof setup> = setup({ hasKlassenZuordnung: false, canChangeKlasse: true });

      expect(wrapper.find('[data-testid="klasse-change-button"]').exists()).toBe(false);
    });

    test('it is disabled when the Klasse cannot be changed', async () => {
      const { wrapper, isDisabled, getTooltipProps }: ReturnType<typeof setup> = setup({
        hasKlassenZuordnung: true,
        canChangeKlasse: false,
      });

      expect(isDisabled('klasse-change-button')).toBe(true);
      expect(getTooltipProps('klasse-change-button')).toMatchObject({
        enabledCondition: false,
        disabledText: 'Wählen Sie bitte zunächst eine Schulzuordnung mit einer Klasse aus.',
      });

      await wrapper.get('[data-testid="klasse-change-button"]').trigger('click');

      expect(wrapper.emitted('changeKlasse')).toBeUndefined();
    });

    test('it emits changeKlasse when the Klasse can be changed', async () => {
      const { wrapper, isDisabled }: ReturnType<typeof setup> = setup({
        hasKlassenZuordnung: true,
        canChangeKlasse: true,
      });

      expect(isDisabled('klasse-change-button')).toBe(false);
      expect(wrapper.get('[data-testid="klasse-change-button"]').text()).toBe('Versetzen');

      await wrapper.get('[data-testid="klasse-change-button"]').trigger('click');

      expect(wrapper.emitted('changeKlasse')).toHaveLength(1);
    });
  });
});
