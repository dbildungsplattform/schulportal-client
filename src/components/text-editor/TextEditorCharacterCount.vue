<script setup lang="ts">
  import type { Editor } from '@tiptap/vue-3';

  type Props = {
    editor: Editor;
    limit: number;
  };

  defineProps<Props>();
</script>
<template>
  <div class="text-right text-body-small">
    {{ $t('textEditor.characterCount.characters', { count: editor.storage.characterCount.characters(), limit }) }}
    <br />
    {{ $t('textEditor.characterCount.words', { count: editor.storage.characterCount.words() }) }}
  </div>
</template>
