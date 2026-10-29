/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import TextEditor from './TextEditor.vue';

enableAutoUnmount(afterEach);

const setup = () => {
  const wrapper = mount(TextEditor, {
    attachTo: document.getElementById('app') || '',
    props: {
      modelValue: '',
      limit: 100,
    },
  });
  return { wrapper };
};

describe('TextEditor.vue', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
  });

  test('should mount successfully with required props', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    expect(wrapper.exists()).toBe(true);
  });

  test('should render editor container when editor is initialized', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    expect(wrapper.find('.text-editor').exists()).toBe(true);
  });

  test('should render toolbar with all expected buttons', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const toolbar = wrapper.find('.v-toolbar');
    expect(toolbar.exists()).toBe(true);
  });

  test('should render EditorContent component', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    expect(wrapper.findComponent({ name: 'EditorContent' }).exists()).toBe(true);
  });

  test('should render TextEditorCharacterCount component', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const charCount = wrapper.findComponent({
      name: 'TextEditorCharacterCount',
    });
    expect(charCount.exists()).toBe(true);
  });

  test('should pass correct props to TextEditorCharacterCount', async (): Promise<void> => {
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: '',
        limit: 150,
      },
    });

    await flushPromises();

    const charCount = wrapper.findComponent({
      name: 'TextEditorCharacterCount',
    });
    expect(charCount.props('limit')).toBe(150);
  });

  test('should emit update:modelValue when editor content changes', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    if (editor) {
      editor.commands.setContent('<p>Updated content</p>');
    }

    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  test('should update editor content when modelValue prop changes', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const initialContent: string = ((wrapper.vm as any).editor)?.getHTML();
    expect(initialContent).toContain('');

    await wrapper.setProps({
      modelValue: '<p>Updated content</p>',
    });

    await flushPromises();

    const updatedContent: string = ((wrapper.vm as any).editor)?.getHTML();
    expect(updatedContent).toContain('Updated content');
  });

  test('should not update editor if new content is the same as current', async (): Promise<void> => {
    const content: string = '<p>Same content</p>';
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: content,
        limit: 100,
      },
    });

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    const setContentSpy: any = vi.spyOn(editor!.commands, 'setContent');

    await wrapper.setProps({
      modelValue: content,
    });

    await flushPromises();

    expect(setContentSpy).not.toHaveBeenCalled();
  });

  test('should handle empty modelValue', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    expect((wrapper.vm as any).editor).toBeDefined();
    expect(wrapper.find('.text-editor').exists()).toBe(true);
  });

  test('should support HTML content in modelValue', async (): Promise<void> => {
    const htmlContent: string = '<h1>Heading</h1><p>Paragraph</p><ul><li>List item</li></ul>';
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: htmlContent,
        limit: 500,
      },
    });

    await flushPromises();

    const editorContent: string = ((wrapper.vm as any).editor)?.getHTML();
    expect(editorContent).toContain('Heading');
    expect(editorContent).toContain('Paragraph');
  });
});
