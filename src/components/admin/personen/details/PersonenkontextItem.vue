<script setup lang="ts">
  import { PendingState, type Props } from '@/components/admin/personen/details/PersonenkontextItem.types';
  import { formatDate } from '@/utils/date';
  import { type ComputedRef, computed } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';

  const props: Props = defineProps<Props>();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const befristung: ComputedRef<string> = computed(() => {
    if (props.zuordnung.befristung) {
      return formatDate(props.zuordnung.befristung, t);
    }
    if (props.showUnlimitedBefristung) {
      return t('admin.befristung.unlimited');
    }
    return '';
  });

  function getSskName(sskDstNr: string | undefined | null, sskName: string): string {
    /* truncate ssk name */
    const truncatededSskName: string = sskName.length > 30 ? `${sskName.substring(0, 30)}...` : sskName;

    /* omit parens when there is no ssk kennung  */
    if (sskDstNr) {
      return `${sskDstNr} (${truncatededSskName})`;
    } else {
      return truncatededSskName;
    }
  }
</script>

<template>
  <span
    class="text-body"
    :class="{
      'my-3 ml-5': props.noMargin !== true,
      'text-green': props.pendingState === PendingState.CREATED,
      'text-red': props.pendingState === PendingState.DELETED,
    }"
  >
    {{ getSskName(zuordnung.sskDstNr, zuordnung.sskName) }}: {{ zuordnung.rolle }}
    {{ zuordnung.klasse }}
    <span
      v-if="befristung"
      data-testid="zuordnung-befristung-text"
    >
      ({{ befristung }})
    </span>
    <template v-if="!props.hidePendingLabel">
      <span v-if="props.pendingState === PendingState.CREATED"> ({{ $t('willBeCreated') }})</span>
      <span v-else-if="props.pendingState === PendingState.DELETED"> ({{ $t('willBeRemoved') }})</span>
    </template>
  </span>
</template>
