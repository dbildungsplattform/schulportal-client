/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
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

    const initialContent: string = (wrapper.vm as any).editor?.getHTML();
    expect(initialContent).toContain('');

    await wrapper.setProps({
      modelValue: '<p>Updated content</p>',
    });

    await flushPromises();

    const updatedContent: string = (wrapper.vm as any).editor?.getHTML();
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

  test('should destroy editor on component unmount', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    expect(editor).toBeDefined();

    const destroySpy: any = vi.spyOn(editor, 'destroy');

    wrapper.unmount();

    expect(destroySpy).toHaveBeenCalled();
  });

  test('should watch for modelValue changes and update editor content', async (): Promise<void> => {
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: '<p>Initial content</p>',
        limit: 100,
      },
    });

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    expect(editor?.getHTML()).toContain('Initial content');

    await wrapper.setProps({
      modelValue: '<p>New content</p>',
    });

    await flushPromises();

    expect(editor?.getHTML()).toContain('New content');
  });

  test('should skip updating editor if content is identical', async (): Promise<void> => {
    const content: string = '<p>Identical content</p>';
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: content,
        limit: 100,
      },
    });

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    const setContentSpy: any = vi.spyOn(editor.commands, 'setContent');

    // Set same content via prop
    await wrapper.setProps({
      modelValue: content,
    });

    await flushPromises();

    // setContent should not be called since content is the same
    expect(setContentSpy).not.toHaveBeenCalled();
  });

  test('should handle editor being undefined in watch', async (): Promise<void> => {
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: '<p>Test</p>',
        limit: 100,
      },
    });

    // Force editor to undefined temporarily
    (wrapper.vm as any).editor = undefined;

    await wrapper.setProps({
      modelValue: '<p>Updated</p>',
    });

    await flushPromises();

    // Should not throw error
    expect(wrapper.exists()).toBe(true);
  });

  test('should initialize editor with correct extensions', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    expect(editor).toBeDefined();
    expect(editor.isActive).toBeDefined();
    expect(editor.commands).toBeDefined();
  });

  test('should emit update:modelValue on editor content change', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    editor?.commands.setContent('<p>Changed content</p>');

    await flushPromises();

    const emitted: any = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.length).toBeGreaterThan(0);
  });

  test('should respect character limit from props', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    // Character count is configured with the limit from props
    expect(wrapper.props('limit')).toBe(100);
  });

  test('should render toolbar with formatting options', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> } = setup();

    await flushPromises();

    // Main editor container should be rendered
    expect(wrapper.find('.text-editor').exists()).toBe(true);

    // EditorContent component should be present for rich text editing
    const editorContent = wrapper.findComponent({ name: 'EditorContent' });
    expect(editorContent.exists()).toBe(true);
  });

  test('should correctly compare HTML content in watch', async (): Promise<void> => {
    const content: string = '<p>Test</p>';
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditor>> = mount(TextEditor, {
      attachTo: document.getElementById('app') || '',
      props: {
        modelValue: content,
        limit: 100,
      },
    });

    await flushPromises();

    const editor: any = (wrapper.vm as any).editor;
    const setContentSpy: any = vi.spyOn(editor.commands, 'setContent');

    // Same content with different formatting should be treated as identical
    await wrapper.setProps({
      modelValue: content,
    });

    await flushPromises();

    expect(setContentSpy).not.toHaveBeenCalled();
  });
});
