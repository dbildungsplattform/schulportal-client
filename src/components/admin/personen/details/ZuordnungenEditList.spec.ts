import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
import { Zuordnung } from '@/stores/types/Zuordnung';
import { DoFactory } from 'test/DoFactory';
import { mount, type VueWrapper } from '@vue/test-utils';
import { VCheckbox } from 'vuetify/components';
import ZuordnungenEditList from './ZuordnungenEditList.vue';

describe('ZuordnungenEditList', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it selects a Zuordnung when there is no pending change', () => {
    const zuordnung: Zuordnung = DoFactory.getZuordnung();
    wrapper = mount(ZuordnungenEditList, {
      props: {
        zuordnungen: [zuordnung],
        newZuordnung: undefined,
        pendingOperation: undefined,
        selectedZuordnungen: [],
      },
    });

    wrapper.findComponent(VCheckbox).vm.$emit('update:modelValue', [zuordnung]);

    expect(wrapper.emitted('update:selectedZuordnungen')).toEqual([[[zuordnung]]]);
    expect(wrapper.findComponent(PersonenkontextItem).props('zuordnung')).toMatchObject({ sskId: zuordnung.sskId });
  });

  test('it marks the new Zuordnung as created while a creation is pending', () => {
    const zuordnung: Zuordnung = DoFactory.getZuordnung();
    wrapper = mount(ZuordnungenEditList, {
      props: {
        zuordnungen: [zuordnung],
        newZuordnung: zuordnung,
        pendingOperation: 'creation',
        selectedZuordnungen: [],
      },
    });

    expect(wrapper.findComponent(PersonenkontextItem).props('pendingState')).toBe(PendingState.CREATED);
  });

  describe('with a selected and an unselected Zuordnung', () => {
    const selectedZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'selected', rolleId: 'rolle' });
    const otherZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'other', rolleId: 'rolle' });
    const zuordnungWithAnotherRolle: Zuordnung = DoFactory.getZuordnung({
      sskId: 'selected',
      rolleId: 'another-rolle',
    });

    function mountWithPendingOperation(
      pendingOperation: ZuordnungOperation,
      newZuordnung: Zuordnung | undefined,
    ): void {
      wrapper = mount(ZuordnungenEditList, {
        props: {
          zuordnungen: [selectedZuordnung, otherZuordnung],
          newZuordnung,
          pendingOperation,
          selectedZuordnungen: [selectedZuordnung],
        },
      });
    }

    function getPendingStates(): Array<PendingState | undefined> {
      return wrapper!
        .findAllComponents(PersonenkontextItem)
        .map(
          (item: VueWrapper<InstanceType<typeof PersonenkontextItem>>) =>
            item.props('pendingState') as PendingState | undefined,
        );
    }

    test('it marks only the new Zuordnung as created while a creation is pending', () => {
      mountWithPendingOperation('creation', otherZuordnung);

      expect(getPendingStates()).toEqual([undefined, PendingState.CREATED]);
    });

    test('it marks the selected Zuordnung as deleted while a deletion is pending', () => {
      mountWithPendingOperation('deletion', undefined);

      expect(getPendingStates()).toEqual([PendingState.DELETED, undefined]);
    });

    test.each<ZuordnungOperation>(['changeKlasse', 'changeBefristung'])(
      'it shows the new Zuordnung next to the replaced one while a %s is pending',
      (pendingOperation: ZuordnungOperation) => {
        const newZuordnung: Zuordnung = DoFactory.getZuordnung({ sskId: 'selected', rolleId: 'rolle' });
        mountWithPendingOperation(pendingOperation, newZuordnung);

        expect(getPendingStates()).toEqual([PendingState.DELETED, PendingState.CREATED, undefined]);
        expect(wrapper!.findAllComponents(PersonenkontextItem)[1]!.props('zuordnung')).toEqual(newZuordnung);
      },
    );

    test.each<[ZuordnungOperation, string, Zuordnung | undefined]>([
      ['changeKlasse', 'no new Zuordnung', undefined],
      ['changeKlasse', 'a new Zuordnung with another Rolle', zuordnungWithAnotherRolle],
      ['changeBefristung', 'no new Zuordnung', undefined],
      ['changeBefristung', 'a new Zuordnung with another Rolle', zuordnungWithAnotherRolle],
    ])(
      'it shows no new Zuordnung while a %s is pending with %s',
      (pendingOperation: ZuordnungOperation, _case: string, newZuordnung: Zuordnung | undefined) => {
        mountWithPendingOperation(pendingOperation, newZuordnung);

        expect(getPendingStates()).toEqual([PendingState.DELETED, undefined]);
      },
    );
  });
});
