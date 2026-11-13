import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
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
        hasPendingChange: false,
        pendingCreation: false,
        pendingDeletion: false,
        pendingChangeKlasse: false,
        pendingChangeBefristung: false,
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
        hasPendingChange: true,
        pendingCreation: true,
        pendingDeletion: false,
        pendingChangeKlasse: false,
        pendingChangeBefristung: false,
        selectedZuordnungen: [],
      },
    });

    expect(wrapper.findComponent(PersonenkontextItem).props('pendingState')).toBe(PendingState.CREATED);
  });
});
