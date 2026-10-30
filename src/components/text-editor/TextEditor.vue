<script setup lang="ts">
  import Link from '@tiptap/extension-link';
  import { CharacterCount } from '@tiptap/extensions';
  import StarterKit from '@tiptap/starter-kit';
  import { EditorContent, useEditor } from '@tiptap/vue-3';
  import { onBeforeUnmount, watch } from 'vue';
  import BoldButton from './button/BoldButton.vue';
  import BulletListButton from './button/BulletListButton.vue';
  import HeadingMenuButton from './button/HeadingMenuButton.vue';
  import ItalicButton from './button/ItalicButton.vue';
  import LinkElementButton from './button/LinkElementButton.vue';
  import OrderedListButton from './button/OrderedListButton.vue';
  import StrikeButton from './button/StrikeButton.vue';
  import UnderlineButton from './button/UnderlineButton.vue';
  import TextEditorCharacterCount from './TextEditorCharacterCount.vue';

  type Props = {
    limit: number;
    modelValue: string;
  };

  type Emits = {
    (event: 'update:modelValue', content: string): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  const editor: ReturnType<typeof useEditor> = useEditor({
    content: props.modelValue,
    // Tiptap's default CSS is injected as an inline <style> tag, which the CSP blocks
    // the rules are defined in the static stylesheet below.
    injectCSS: false,
    extensions: [
      StarterKit,
      CharacterCount.configure({
        limit: props.limit,
      }),
      Link.configure({
        openOnClick: false,
        markdownLinks: true,
        defaultProtocol: 'https',
      }),
    ],
    // eslint-disable-next-line @typescript-eslint/typedef
    onUpdate: ({ editor }): void => {
      emit('update:modelValue', editor.getHTML());
    },
  });

  onBeforeUnmount(() => {
    if (editor.value) {
      editor.value.destroy();
    }
  });

  watch(
    () => props.modelValue,
    (newValue: string) => {
      if (!editor.value) {
        return;
      }
      const isSame: boolean = editor.value.getHTML() === newValue;
      // JSON
      // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

      if (isSame) {
        return;
      }

      editor.value.commands.setContent(newValue);
    },
  );
</script>
<template>
  <div v-if="editor">
    <v-container class="text-editor">
      <v-card variant="outlined">
        <v-toolbar density="compact">
          <v-toolbar-items>
            <BoldButton :editor="editor" />
            <ItalicButton :editor="editor" />
            <UnderlineButton :editor="editor" />
            <StrikeButton :editor="editor" />
            <v-divider vertical />
            <BulletListButton :editor="editor" />
            <OrderedListButton :editor="editor" />
            <v-divider vertical />
            <HeadingMenuButton :editor="editor" />
            <v-divider vertical />
            <LinkElementButton :editor="editor" />
          </v-toolbar-items>
        </v-toolbar>
        <v-card-text>
          <EditorContent :editor="editor" />
          <v-divider class="my-2" />
          <TextEditorCharacterCount
            :editor="editor"
            :limit="limit"
          />
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<style>
  .text-editor .v-btn.v-btn--variant-text:focus .v-btn__content,
  .text-editor .v-btn.v-btn--variant-text:hover .v-btn__content {
    text-decoration: none;
  }

  .text-editor .tiptap:focus {
    outline: none;
  }
</style>
