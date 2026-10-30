/* eslint-disable @typescript-eslint/typedef */
import type { Editor } from '@tiptap/vue-3';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import TextEditorCharacterCount from './TextEditorCharacterCount.vue';

enableAutoUnmount(afterEach);

const createMockEditor = (charCount: number = 10, wordCount: number = 2): Partial<Editor> => {
  return {
    storage: {
      characterCount: {
        characters: (): number => charCount,
        words: (): number => wordCount,
      },
    },
  };
};

const setup = (
  charCount: number = 10,
  wordCount: number = 2,
  limit: number = 100,
): {
  wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>>;
} => {
  const mockEditor = createMockEditor(charCount, wordCount);
  const wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> = mount(TextEditorCharacterCount, {
    attachTo: document.getElementById('app') || '',
    props: {
      editor: mockEditor,
      limit,
    },
  });
  return { wrapper };
};

describe('TextEditorCharacterCount.vue', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
  });

  test('should mount successfully with required props', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup(5, 1);

    expect(wrapper.exists()).toBe(true);
  });

  test('should render character count information', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup(15, 3);

    const text: string = wrapper.text();
    expect(text).toContain('15');
    expect(text).toContain('100');
  });

  test('should render word count information', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup(20, 4);

    const text: string = wrapper.text();
    expect(text).toContain('4');
    expect(text).toContain('Wörter');
  });

  test.each([
    { charCount: 0, wordCount: 0, limit: 100 },
    { charCount: 50, wordCount: 10, limit: 100 },
    { charCount: 95, wordCount: 15, limit: 100 },
    { charCount: 5000, wordCount: 850, limit: 10000 },
  ])(
    'should handle different character counts: $charCount chars, $wordCount words',
    ({ charCount, wordCount, limit }: { charCount: number; wordCount: number; limit: number }): void => {
      const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup(
        charCount,
        wordCount,
        limit,
      );

      expect(wrapper.exists()).toBe(true);
    },
  );

  test('should render with text-right class', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup();

    expect(wrapper.find('div.text-right').exists()).toBe(true);
  });

  test('should render with text-body-small class for typography', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorCharacterCount>> } = setup();

    expect(wrapper.find('div.text-body-small').exists()).toBe(true);
  });
});
