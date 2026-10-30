<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <TextEditorBaseButton
    icon="mdi-format-list-numbered"
    :tooltip="$t('textEditor.button.orderedList')"
    testId="ordered-list-button"
    :active="editor.isActive('orderedList')"
    @click="editor.chain().focus().toggleOrderedList().run()"
  />
</template>
