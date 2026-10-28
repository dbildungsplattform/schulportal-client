<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <text-editor-base-button
    icon="mdi-format-strikethrough"
    :tooltip="$t('textEditor.button.strike')"
    testId="strike-button"
    :active="editor.isActive('strike')"
    @click="editor.chain().focus().toggleStrike().run()"
  />
</template>
