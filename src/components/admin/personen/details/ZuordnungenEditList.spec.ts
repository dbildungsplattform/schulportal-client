import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
import { Zuordnung } from '@/stores/types/Zuordnung';
import { DoFactory } from 'test/DoFactory';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { VCheckbox } from 'vuetify/components';
import ZuordnungenEditList from './ZuordnungenEditList.vue';

type ZuordnungenEditListSetup = {
  wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditList>>;
  zuordnung: Zuordnung;
};

type PendingOperationSetup = {
  wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditList>>;
  selectedZuordnung: Zuordnung;
  otherZuordnung: Zuordnung;
  getPendingStates: () => Array<PendingState | undefined>;
};

describe('ZuordnungenEditList', () => {
  enableAutoUnmount(afterEach);

  const setup = (
    props: {
      zuordnungen?: Zuordnung[];
      newZuordnung?: Zuordnung | undefined;
      pendingOperation?: ZuordnungOperation | undefined;
      selectedZuordnungen?: Zuordnung[];
    } = {},
  ): ZuordnungenEditListSetup => {
    const zuordnung: Zuordnung = DoFactory.getZuordnung();
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditList>> = mount(ZuordnungenEditList, {
      props: {
        zuordnungen: [zuordnung],
        newZuordnung: undefined,
        pendingOperation: undefined,
        selectedZuordnungen: [],
        ...props,
      },
    });

    return { wrapper, zuordnung };
  };

  test('it selects a Zuordnung when there is no pending change', () => {
    const { wrapper, zuordnung }: ReturnType<typeof setup> = setup();

    wrapper.findComponent(VCheckbox).vm.$emit('update:modelValue', [zuordnung]);

    expect(wrapper.emitted('update:selectedZuordnungen')).toEqual([[[zuordnung]]]);
    expect(wrapper.findComponent(PersonenkontextItem).props('zuordnung')).toMatchObject({ sskId: zuordnung.sskId });
  });

  test('it marks the new Zuordnung as created while a creation is pending', () => {
    const zuordnung: Zuordnung = DoFactory.getZuordnung();
    const { wrapper }: ReturnType<typeof setup> = setup({
      zuordnungen: [zuordnung],
      newZuordnung: zuordnung,
      pendingOperation: 'creation',
    });

    expect(wrapper.findComponent(PersonenkontextItem).props('pendingState')).toBe(PendingState.CREATED);
  });

  describe('with a selected and an unselected Zuordnung', () => {
    const setupPendingOperation = (
      pendingOperation: ZuordnungOperation,
      newZuordnung: Zuordnung | undefined,
    ): PendingOperationSetup => {
      const selectedZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'selected', rolleId: 'rolle' });
      const otherZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'other', rolleId: 'rolle' });
      const wrapper: VueWrapper<InstanceType<typeof ZuordnungenEditList>> = mount(ZuordnungenEditList, {
        props: {
          zuordnungen: [selectedZuordnung, otherZuordnung],
          newZuordnung,
          pendingOperation,
          selectedZuordnungen: [selectedZuordnung],
        },
      });
      const getPendingStates: () => Array<PendingState | undefined> = () =>
        wrapper
          .findAllComponents(PersonenkontextItem)
          .map(
            (item: VueWrapper<InstanceType<typeof PersonenkontextItem>>) =>
              item.props('pendingState') as PendingState | undefined,
          );
      return { wrapper, selectedZuordnung, otherZuordnung, getPendingStates };
    };

    test('it marks only the new Zuordnung as created while a creation is pending', () => {
      const otherZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'other', rolleId: 'rolle' });
      const { getPendingStates }: ReturnType<typeof setupPendingOperation> = setupPendingOperation(
        'creation',
        otherZuordnung,
      );

      expect(getPendingStates()).toEqual([undefined, PendingState.CREATED]);
    });

    test('it marks the selected Zuordnung as deleted while a deletion is pending', () => {
      const { getPendingStates }: ReturnType<typeof setupPendingOperation> = setupPendingOperation(
        'deletion',
        undefined,
      );

      expect(getPendingStates()).toEqual([PendingState.DELETED, undefined]);
    });

    test.each<ZuordnungOperation>(['changeKlasse', 'changeBefristung'])(
      'it shows the new Zuordnung next to the replaced one while a %s is pending',
      (pendingOperation: ZuordnungOperation) => {
        const newZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'selected', rolleId: 'rolle' });
        const { wrapper, getPendingStates }: ReturnType<typeof setupPendingOperation> = setupPendingOperation(
          pendingOperation,
          newZuordnung,
        );

        expect(getPendingStates()).toEqual([PendingState.DELETED, PendingState.CREATED, undefined]);
        expect(wrapper.findAllComponents(PersonenkontextItem)[1]!.props('zuordnung')).toEqual(newZuordnung);
      },
    );

    test.each<[ZuordnungOperation, string, boolean]>([
      ['changeKlasse', 'no new Zuordnung', false],
      ['changeKlasse', 'a new Zuordnung with another Rolle', true],
      ['changeBefristung', 'no new Zuordnung', false],
      ['changeBefristung', 'a new Zuordnung with another Rolle', true],
    ])(
      'it shows no new Zuordnung while a %s is pending with %s',
      (pendingOperation: ZuordnungOperation, _case: string, hasDifferentRolle: boolean) => {
        const newZuordnung: Zuordnung | undefined = hasDifferentRolle
          ? DoFactory.getZuordnung({ sskId: 'selected', rolleId: 'another-rolle' })
          : undefined;
        const { getPendingStates }: ReturnType<typeof setupPendingOperation> = setupPendingOperation(
          pendingOperation,
          newZuordnung,
        );

        expect(getPendingStates()).toEqual([PendingState.DELETED, undefined]);
      },
    );
  });
});
