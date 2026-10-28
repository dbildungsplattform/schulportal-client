<script setup lang="ts">
  import { Editor } from '@tiptap/vue-3';
  import TextEditorBaseButton from './TextEditorBaseButton.vue';

  defineProps<{ editor: Editor }>();
</script>
<template>
  <text-editor-base-button
    icon="mdi-format-list-bulleted"
    :tooltip="$t('textEditor.button.bulletList')"
    testId="bullet-list-button"
    :active="editor.isActive('bulletList')"
    @click="editor.chain().focus().toggleBulletList().run()"
  />
</template>
