import { expect, test, describe } from 'vitest';
import { DOMWrapper, mount, VueWrapper } from '@vue/test-utils';
import RollenerweiterungTreeview, { type RolleForSelection } from './RollenerweiterungTreeview.vue';
import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';

const mockRollen: RolleForSelection[] = [
  { id: 'lehr-1', name: 'Lehrer A', rollenart: RollenArt.Lehr },
  { id: 'lehr-2', name: 'Lehrer B', rollenart: RollenArt.Lehr },
  { id: 'lern-1', name: 'Schüler A', rollenart: RollenArt.Lern },
  { id: 'leit-1', name: 'Schulleiter A', rollenart: RollenArt.Leit },
  {
    id: 'mpt-1',
    name: 'MPT A',
    rollenart: RollenArt.Schb,
    merkmale: RollenMerkmal.MptRolle ? [RollenMerkmal.MptRolle] : undefined,
  },
];

function mountComponent(
  props: Partial<InstanceType<typeof RollenerweiterungTreeview>['$props']> = {},
): VueWrapper<InstanceType<typeof RollenerweiterungTreeview>> {
  return mount(RollenerweiterungTreeview, {
    props: {
      availableRollen: mockRollen,
      initiallySelectedRolleIds: [],
      loading: false,
      ...props,
    },
  });
}

describe('RollenerweiterungTreeview - Loading state', () => {
  test('shows spinner when loading is true', () => {
    const wrapper: VueWrapper = mountComponent({ loading: true }) as VueWrapper;
    expect(wrapper.find('.v-progress-circular').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rollenerweiterung-tree"]').exists()).toBe(false);
  });

  test('hides spinner when loading is false', () => {
    const wrapper: VueWrapper = mountComponent({ loading: false }) as VueWrapper;
    expect(wrapper.find('.v-progress-circular').exists()).toBe(false);
  });
});

describe('RollenerweiterungTreeview - Empty state', () => {
  test('shows empty message when no rollen are available', () => {
    const wrapper: VueWrapper = mountComponent({ availableRollen: [] }) as VueWrapper;
    expect(wrapper.find('.treeview-empty').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rollenerweiterung-tree"]').exists()).toBe(false);
  });

  test('does not show empty message when rollen are available', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    expect(wrapper.find('.treeview-empty').exists()).toBe(false);
  });
});

describe('RollenerweiterungTreeview - Group rendering', () => {
  test('renders group node for each rollenart present', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    expect(wrapper.find('[data-testid="treeview-group-LEHR"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="treeview-group-LERN"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="treeview-group-LEIT"]').exists()).toBe(true);
  });

  test('does not render group when no rollen exist for that rollenart', () => {
    const wrapper: VueWrapper = mountComponent({
      availableRollen: [
        { id: 'lehr-1', name: 'Lehrer A', rollenart: RollenArt.Lehr },
        {
          id: 'lehr-2',
          name: 'MPT Lehrer B',
          rollenart: RollenArt.Nlehr,
          merkmale: RollenMerkmal.MptRolle ? [RollenMerkmal.MptRolle] : undefined,
        },
      ],
    }) as VueWrapper;
    expect(wrapper.find('[data-testid="treeview-group-LEHR"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="treeview-group-MPT"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="treeview-group-LERN"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="treeview-group-LEIT"]').exists()).toBe(false);
  });
});

describe('RollenerweiterungTreeview - toggleGroupSelection', () => {
  test('selects all rollen in a group when none are selected', async () => {
    const wrapper: VueWrapper = mountComponent({ initiallySelectedRolleIds: [] }) as VueWrapper;
    const groupHeader: DOMWrapper<Element> = wrapper.find('[data-testid="treeview-group-checkbox-LEHR"]');
    await groupHeader.trigger('click');

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toEqual(expect.arrayContaining(['lehr-1', 'lehr-2']));
  });

  test('selects all rollen in a group when some are selected (indeterminate)', async () => {
    const wrapper: VueWrapper = mountComponent({ initiallySelectedRolleIds: ['lehr-1'] }) as VueWrapper;
    const groupHeader: DOMWrapper<Element> = wrapper.find('[data-testid="treeview-group-checkbox-LEHR"]');
    await groupHeader.trigger('click');

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    expect(emitted).toBeTruthy();
    const lastEmit: string[] = emitted![emitted!.length - 1]![0] as string[];
    expect(lastEmit).toEqual(expect.arrayContaining(['lehr-1', 'lehr-2']));
  });

  test('deselects all rollen in a group when all are selected', async () => {
    const wrapper: VueWrapper = mountComponent({ initiallySelectedRolleIds: ['lehr-1', 'lehr-2'] }) as VueWrapper;
    const groupHeader: DOMWrapper<Element> = wrapper.find('[data-testid="treeview-group-checkbox-LEHR"]');
    await groupHeader.trigger('click');

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    expect(emitted).toBeTruthy();
    const lastEmit: string[] = emitted![emitted!.length - 1]![0] as string[];
    expect(lastEmit).not.toContain('lehr-1');
    expect(lastEmit).not.toContain('lehr-2');
  });

  test('does not affect rollen from other groups when toggling', async () => {
    const wrapper: VueWrapper = mountComponent({ initiallySelectedRolleIds: ['lern-1'] }) as VueWrapper;
    const groupHeader: DOMWrapper<Element> = wrapper.find('[data-testid="treeview-group-checkbox-LEHR"]');
    await groupHeader.trigger('click');

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    const lastEmit: string[] = emitted![emitted!.length - 1]![0] as string[];
    expect(lastEmit).toContain('lern-1');
  });
});

describe('RollenerweiterungTreeview - onSelectionUpdate', () => {
  test('emits only valid leaf IDs on treeview model update', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', ['lehr-1', 'lern-1']);

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toEqual(expect.arrayContaining(['lehr-1', 'lern-1']));
  });

  test('filters out non-leaf (group) IDs', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', ['lehr-1', 'group-LEHR']);

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    const lastEmit: string[] = emitted![emitted!.length - 1]![0] as string[];
    expect(lastEmit).toContain('lehr-1');
    expect(lastEmit).not.toContain('group-LEHR');
  });

  test('emits empty array when called with non-array value', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', null);

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    expect(emitted![emitted!.length - 1]![0]).toEqual([]);
  });

  test('filters out non-string values from array', () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', ['lehr-1', 123, null, 'lern-1']);

    const emitted: unknown[][] | undefined = wrapper.emitted('update:selectedRolleIds');
    const lastEmit: string[] = emitted![emitted!.length - 1]![0] as string[];
    expect(lastEmit).toEqual(expect.arrayContaining(['lehr-1', 'lern-1']));
    expect(lastEmit).toHaveLength(2);
  });
});
