<script setup lang="ts">
  import Link from '@tiptap/extension-link';
  import { CharacterCount } from '@tiptap/extensions';
  import StarterKit from '@tiptap/starter-kit';
  import { Editor, EditorContent } from '@tiptap/vue-3';
  import { onBeforeUnmount, onMounted, watch } from 'vue';
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

  let editor!: Editor;

  onMounted(() => {
    editor = new Editor({
      content: props.modelValue,
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
      onUpdate: (): void => {
        emit('update:modelValue', editor.getHTML());
      },
    });
  });

  onBeforeUnmount(() => {
    if (editor) {
      editor.destroy();
    }
  });

  watch(
    () => props.modelValue,
    (newValue: string) => {
      if (!editor) {
        return;
      }
      const isSame: boolean = editor.getHTML() === newValue;
      // JSON
      // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

      if (isSame) {
        return;
      }

      editor.commands.setContent(newValue);
    },
  );
</script>
<template>
  <div v-if="editor">
    <v-container class="text-editor">
      <v-card>
        <v-toolbar density="compact">
          <v-toolbar-items>
            <bold-button :editor="editor" />
            <italic-button :editor="editor" />
            <underline-button :editor="editor" />
            <strike-button :editor="editor" />
            <v-divider vertical />
            <bullet-list-button :editor="editor" />
            <ordered-list-button :editor="editor" />
            <v-divider vertical />
            <heading-menu-button :editor="editor" />
            <v-divider vertical />
            <link-element-button :editor="editor" />
          </v-toolbar-items>
        </v-toolbar>
        <v-card-text>
          <editor-content :editor="editor" />
          <v-divider class="my-2" />
          <text-editor-character-count
            :editor="editor"
            :limit="limit"
          />
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<style>
  .v-btn.v-btn--variant-text:focus .v-btn__content,
  .v-btn.v-btn--variant-text:hover .v-btn__content {
    text-decoration: none;
  }
  .text-editor .tiptap {
    height: 10rem;
    overflow: auto;
  }

  .text-editor .tiptap:focus {
    outline: none;
  }
</style>
