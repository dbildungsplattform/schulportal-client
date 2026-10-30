<script setup lang="ts">
  import type { Editor } from '@tiptap/vue-3';
  import { mergeProps, ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  const menu: Ref<boolean> = ref(false);

  type Props = {
    editor: Editor;
  };

  const props: Props = defineProps<Props>();

  const { t }: Composer = useI18n({ useScope: 'global' });

  const linkText: Ref<string> = ref('');

  const linkHandler = (): void => {
    const href: unknown = props.editor.getAttributes('link')['href'];
    linkText.value = typeof href === 'string' ? href : '';
  };

  const clearLink = (): void => {
    linkText.value = '';
    props.editor.chain().focus().unsetLink().run();
    menu.value = false;
  };

  const setLink = (): void => {
    if (!linkText.value) {
      return;
    }

    const attributes: { href: string; title: string; target: string } = {
      href: linkText.value,
      title: linkText.value,
      target: '_blank',
    };

    if (props.editor.state.selection.empty && !props.editor.isActive('link')) {
      props.editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText.value,
          marks: [{ type: 'link', attrs: attributes }],
        })
        .run();

      return;
    }

    props.editor.chain().focus().extendMarkRange('link').setLink(attributes).run();
    menu.value = false;
  };
</script>
<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    location="bottom"
  >
    <template v-slot:activator="{ props: menuProps }">
      <v-tooltip
        :text="t('textEditor.button.link')"
        location="bottom"
      >
        <template v-slot:activator="{ props: tooltipProps }">
          <v-btn
            icon="mdi-link"
            v-bind="mergeProps(menuProps, tooltipProps)"
            data-testid="link-button"
            :active="editor.isActive('link')"
            :aria-label="t('textEditor.button.link')"
            @click="linkHandler"
          >
          </v-btn>
        </template>
      </v-tooltip>
    </template>
    <v-sheet
      min-width="250"
      class="px-2 pt-2"
    >
      <v-text-field
        v-model="linkText"
        density="compact"
        :placeholder="t('textEditor.button.linkPlaceholder')"
        variant="outlined"
        @keydown.enter="setLink"
      >
        <template v-slot:append>
          <v-tooltip
            :text="t('textEditor.button.clearLink')"
            location="bottom"
          >
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn
                :disabled="!linkText"
                color="red"
                v-bind="activatorProps"
                icon="mdi-delete"
                size="x-small"
                variant="text"
                :aria-label="t('textEditor.button.clearLink')"
                @click="clearLink"
              />
            </template>
          </v-tooltip>
        </template>
        <template v-slot:append-inner>
          <v-tooltip
            :text="t('textEditor.button.confirmLink')"
            location="bottom"
          >
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn
                :disabled="!linkText"
                v-bind="activatorProps"
                icon="mdi-keyboard-return"
                size="x-small"
                variant="text"
                :aria-label="t('textEditor.button.confirmLink')"
                @click="setLink"
              />
            </template>
          </v-tooltip>
        </template>
      </v-text-field>
    </v-sheet>
  </v-menu>
</template>
