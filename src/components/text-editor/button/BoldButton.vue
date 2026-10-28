<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <text-editor-base-button
    icon="mdi-format-bold"
    :tooltip="$t('textEditor.button.bold')"
    testId="bold-button"
    :active="editor.isActive('bold')"
    @click="editor.chain().focus().toggleBold().run()"
  />
</template>
