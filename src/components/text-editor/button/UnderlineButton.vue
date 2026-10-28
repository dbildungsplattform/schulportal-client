<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <text-editor-base-button
    icon="mdi-format-underline"
    :tooltip="$t('textEditor.button.underline')"
    testId="underline-button"
    :active="editor.isActive('underline')"
    @click="editor.chain().focus().toggleUnderline().run()"
  />
</template>
