<script setup lang="ts">
  import type { Editor } from '@tiptap/vue-3';
  import { mergeProps } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Level = 1 | 2 | 3;

  type Props = {
    editor: Editor;
  };

  const props: Props = defineProps<Props>();

  const { t }: Composer = useI18n({ useScope: 'global' });

  const items: { icon: string; level: Level }[] = [
    { icon: 'mdi-format-header-1', level: 1 },
    { icon: 'mdi-format-header-2', level: 2 },
    { icon: 'mdi-format-header-3', level: 3 },
  ];

  const getActiveIcon = (): string => {
    const activeItem: { icon: string; level: Level } | undefined = items.find(
      (item: { icon: string; level: Level }): boolean => props.editor.isActive('heading', { level: item.level }),
    );
    return activeItem?.icon ?? 'mdi-format-header-pound';
  };
</script>
<template>
  <v-menu>
    <template v-slot:activator="{ props: menuProps }">
      <v-tooltip
        :text="t('textEditor.button.heading')"
        location="bottom"
      >
        <template v-slot:activator="{ props: tooltipProps }">
          <v-btn
            v-bind="mergeProps(menuProps, tooltipProps)"
            :icon="getActiveIcon()"
            :active="editor.isActive('heading')"
            :aria-label="t('textEditor.button.heading')"
            data-testid="heading-menu-button"
          />
        </template>
      </v-tooltip>
    </template>
    <v-list>
      <v-list-item
        v-for="item in items"
        :key="item.level"
        :value="item.level"
        :active="editor.isActive('heading', { level: item.level })"
        @click="editor.chain().focus().toggleHeading({ level: item.level }).run()"
      >
        <v-list-item-title>
          <v-icon :icon="item.icon" />
          {{ t('textEditor.button.headingLevel', { level: item.level }) }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
