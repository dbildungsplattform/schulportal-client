<script setup lang="ts">
  import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';
  import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  const { t }: Composer = useI18n({ useScope: 'global' });

  export type RolleForSelection = {
    id: string;
    name: string;
    rollenart: RollenArt;
    merkmale?: RollenMerkmal[];
  };

  type TreeNode = {
    id: string;
    title: string;
    isGroup: boolean;
    rollenart?: RollenArt | 'MPT';
    scrollable?: boolean;
    children?: TreeNode[];
  };

  type RolleSelection = { key: string; rollen: RolleForSelection[] };

  enum StateSelection {
    All = 'all',
    Some = 'some',
    None = 'none',
  }

  type Props = {
    availableRollen: RolleForSelection[];
    initiallySelectedRolleIds?: string[];
    loading?: boolean;
  };

  type Emits = (e: 'update:selectedRolleIds', ids: string[]) => void;

  const props: Props = withDefaults(defineProps<Props>(), {
    initiallySelectedRolleIds: () => [],
    loading: false,
  });

  const emit: Emits = defineEmits<Emits>();

  // A "group key" is either a real RollenArt, or the synthetic MPT bucket
  type GroupKey = RollenArt | 'MPT';

  type GroupDefinition = {
    key: GroupKey;
    labelKey: string;
    match: (r: RolleForSelection) => boolean;
  };

  const isMptRolle = (r: RolleForSelection): boolean =>
    Array.isArray(r.merkmale) && r.merkmale.includes(RollenMerkmal.MptRolle);

  const GROUP_DEFINITIONS: GroupDefinition[] = [
    {
      key: RollenArt.Lehr,
      labelKey: 'angebot.groupLehr',
      match: (r: RolleForSelection) => r.rollenart === RollenArt.Lehr && !isMptRolle(r),
    },
    {
      key: RollenArt.Lern,
      labelKey: 'angebot.groupLern',
      match: (r: RolleForSelection) => r.rollenart === RollenArt.Lern && !isMptRolle(r),
    },
    {
      key: RollenArt.Leit,
      labelKey: 'angebot.groupLeit',
      match: (r: RolleForSelection) => r.rollenart === RollenArt.Leit && !isMptRolle(r),
    },
    // Group all MPT Rollen together, regardless of their RollenArt (e.g. Lehr, Nlehr, Schb)
    {
      key: 'MPT',
      labelKey: 'angebot.groupMPT',
      match: (r: RolleForSelection) => isMptRolle(r),
    },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  const selected: Ref<string[]> = ref([...(props.initiallySelectedRolleIds ?? [])]);
  const opened: Ref<string[]> = ref(['group-LEHR', 'group-LERN']);

  watch(
    () => props.initiallySelectedRolleIds,
    (ids: string[] | undefined) => {
      selected.value = [...(ids ?? [])];
    },
  );

  // ── Tree data ──────────────────────────────────────────────────────────────
  const allRolleIds: ComputedRef<Set<string>> = computed(
    () => new Set(props.availableRollen.map((r: RolleForSelection) => r.id)),
  );

  const fullGroups: ComputedRef<RolleSelection[]> = computed(() =>
    GROUP_DEFINITIONS.map((def: GroupDefinition) => ({
      key: def.key,
      rollen: props.availableRollen.filter((r: RolleForSelection) => def.match(r)),
    })).filter((g: RolleSelection) => g.rollen.length > 0),
  );

  const treeItems: ComputedRef<TreeNode[]> = computed(() => {
    return GROUP_DEFINITIONS.flatMap((def: GroupDefinition) => {
      const allChildren: RolleForSelection[] = props.availableRollen
        .filter((r: RolleForSelection) => def.match(r))
        .sort((a: RolleForSelection, b: RolleForSelection) => a.name.localeCompare(b.name));

      if (allChildren.length === 0) {
        return [];
      }

      return [
        {
          id: `group-${def.key}`,
          title: t(def.labelKey),
          isGroup: true,
          rollenart: def.key,
          scrollable: allChildren.length > 15,
          children: allChildren.map((r: RolleForSelection) => ({
            id: r.id,
            title: r.name,
            isGroup: false,
          })),
        } satisfies TreeNode,
      ];
    });
  });

  function getGroupRolleIds(groupKey: string): string[] {
    const group: RolleSelection | undefined = fullGroups.value.find((g: RolleSelection) => g.key === groupKey);
    return group?.rollen.map((r: RolleForSelection) => r.id) ?? [];
  }

  function getGroupSelectedCount(rollenart: string): number {
    return getGroupRolleIds(rollenart).filter((id: string) => selected.value.includes(id)).length;
  }

  function getGroupTotalCount(rollenart: string): number {
    return getGroupRolleIds(rollenart).length;
  }

  function getGroupSelectionState(rollenart: string): StateSelection {
    const total: number = getGroupTotalCount(rollenart);
    const count: number = getGroupSelectedCount(rollenart);
    if (count === 0) {
      return StateSelection.None;
    }
    if (count === total) {
      return StateSelection.All;
    }
    return StateSelection.Some;
  }

  function toggleGroupSelection(rollenart: string): void {
    const ids: string[] = getGroupRolleIds(rollenart);
    const state: StateSelection = getGroupSelectionState(rollenart);
    const current: Set<string> = new Set(selected.value);

    if (state === StateSelection.All) {
      ids.forEach((id: string) => current.delete(id));
    } else {
      ids.forEach((id: string) => current.add(id));
    }

    const leafIds: string[] = Array.from(current).filter((id: string) => allRolleIds.value.has(id));
    selected.value = leafIds;
    emit('update:selectedRolleIds', leafIds);
  }

  function onSelectionUpdate(val: unknown): void {
    const ids: string[] = Array.isArray(val) ? val.filter((id: unknown): id is string => typeof id === 'string') : [];
    const leafIds: string[] = ids.filter((id: string) => allRolleIds.value.has(id));
    selected.value = leafIds;
    emit('update:selectedRolleIds', leafIds);
  }
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="loading"
      class="d-flex justify-center pa-8"
    >
      <v-progress-circular
        color="primary"
        indeterminate
      />
    </div>

    <!-- Empty -->
    <div
      v-else-if="treeItems.length === 0"
      class="treeview-empty pa-6 text-center text-medium-emphasis"
    >
      {{ t('angebot.noRolesFound') }}
    </div>

    <!-- Treeview -->
    <v-treeview
      v-else
      v-model:opened="opened"
      data-testid="rollenerweiterung-tree"
      :items="treeItems"
      item-value="id"
      item-title="title"
      item-children="children"
      select-strategy="independent"
      class="rolle-treeview"
      density="compact"
      :model-value="selected"
      @update:model-value="onSelectionUpdate"
    >
      <!-- Suppress default title for group nodes (title is rendered in #prepend) -->
      <template #title="{ item }">
        <template v-if="!(item as TreeNode).isGroup">
          <span>{{ item.title }}</span>
        </template>
      </template>
      <template #prepend="{ item }">
        <template v-if="item.isGroup">
          <div
            class="group-row d-flex align-center w-100 flex-wrap"
            :data-testid="`treeview-group-${item.rollenart}`"
            :data-scrollable="item.scrollable || undefined"
            :class="{ 'group-children-scrollable': item.scrollable }"
            @click="toggleGroupSelection(item.rollenart!)"
          >
            <v-checkbox
              :data-testid="`treeview-group-checkbox-${item.rollenart}`"
              :model-value="getGroupSelectionState(item.rollenart!) === StateSelection.All"
              :indeterminate="getGroupSelectionState(item.rollenart!) === StateSelection.Some"
              @click.stop="toggleGroupSelection(item.rollenart!)"
            />
            <span class="group-title bold text-body">{{ item.title }}</span>
            <span class="ml-2 text-body">
              ({{ getGroupSelectedCount(item.rollenart!) }} {{ t('from') }} {{ getGroupTotalCount(item.rollenart!) }})
            </span>
          </div>
        </template>

        <template v-else>
          <v-checkbox
            :model-value="selected.includes(item.id)"
            @click.stop="
              onSelectionUpdate(
                selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id],
              )
            "
          />
        </template>
      </template>
    </v-treeview>
  </div>
</template>
