<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <TextEditorBaseButton
    icon="mdi-format-italic"
    :tooltip="$t('textEditor.button.italic')"
    testId="italic-button"
    :active="editor.isActive('italic')"
    @click="editor.chain().focus().toggleItalic().run()"
  />
</template>
