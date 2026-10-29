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
  TextEditor: Hier soll der Text für die Newsbox eingegeben werden. {{ JSON.stringify(editor) }}
  <div v-if="editor">
    Nach If: Editor ist vorhanden.
    <v-container class="text-editor">
      <v-card>
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

  .ProseMirror {
    position: relative;
    word-wrap: break-word;
    white-space: pre-wrap;
    white-space: break-spaces;
    -webkit-font-variant-ligatures: none;
    font-variant-ligatures: none;
    font-feature-settings: 'liga' 0;
  }

  .ProseMirror [contenteditable='false'] {
    white-space: normal;
  }

  .ProseMirror [contenteditable='false'] [contenteditable='true'] {
    white-space: pre-wrap;
  }

  .ProseMirror pre {
    white-space: pre-wrap;
  }

  img.ProseMirror-separator {
    display: inline !important;
    border: none !important;
    margin: 0 !important;
    width: 0 !important;
    height: 0 !important;
  }

  .ProseMirror-gapcursor {
    display: none;
    pointer-events: none;
    position: absolute;
    margin: 0;
  }

  .ProseMirror-gapcursor:after {
    content: '';
    display: block;
    position: absolute;
    top: -2px;
    width: 20px;
    border-top: 1px solid black;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }

  @keyframes ProseMirror-cursor-blink {
    to {
      visibility: hidden;
    }
  }

  .ProseMirror-hideselection *::selection {
    background: transparent;
  }

  .ProseMirror-hideselection *::-moz-selection {
    background: transparent;
  }

  .ProseMirror-hideselection * {
    caret-color: transparent;
  }

  .ProseMirror-focused .ProseMirror-gapcursor {
    display: block;
  }
</style>
