/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import BoldButton from './BoldButton.vue';
import ItalicButton from './ItalicButton.vue';
import UnderlineButton from './UnderlineButton.vue';
import StrikeButton from './StrikeButton.vue';
import BulletListButton from './BulletListButton.vue';
import OrderedListButton from './OrderedListButton.vue';

enableAutoUnmount(afterEach);

const createMockEditor = (activeFormat: string = ''): any => {
  return {
    isActive: (format: string): boolean => format === activeFormat,
    chain: (): any => ({
      focus: (): any => ({
        toggleBold: (): any => ({ run: (): void => {} }),
        toggleItalic: (): any => ({ run: (): void => {} }),
        toggleUnderline: (): any => ({ run: (): void => {} }),
        toggleStrike: (): any => ({ run: (): void => {} }),
        toggleBulletList: (): any => ({ run: (): void => {} }),
        toggleOrderedList: (): any => ({ run: (): void => {} }),
      }),
    }),
  };
};

const setupButton = (component: any, activeFormat: string = ''): { wrapper: any } => {
  const mockEditor: any = createMockEditor(activeFormat);
  const wrapper: any = mount(component, {
    attachTo: document.getElementById('app') || '',
    props: {
      editor: mockEditor,
    },
  });
  return { wrapper };
};

describe('TextEditor Simple Buttons', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
  });

  describe('BoldButton.vue', (): void => {
    test('should mount successfully with editor prop', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BoldButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render TextEditorBaseButton with correct props', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BoldButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.exists()).toBe(true);
      expect(baseButton.props('icon')).toBe('mdi-format-bold');
      expect(baseButton.props('testId')).toBe('bold-button');
    });

    test('should show active state when bold is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BoldButton,
        'bold',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });

    test('should show inactive state when bold is not active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BoldButton,
        '',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(false);
    });
  });

  describe('ItalicButton.vue', (): void => {
    test('should mount successfully', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        ItalicButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render with correct icon', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        ItalicButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('icon')).toBe('mdi-format-italic');
    });

    test('should show active state when italic is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        ItalicButton,
        'italic',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });
  });

  describe('UnderlineButton.vue', (): void => {
    test('should mount successfully', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        UnderlineButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render with correct icon', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        UnderlineButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('icon')).toBe('mdi-format-underline');
    });

    test('should show active state when underline is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        UnderlineButton,
        'underline',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });
  });

  describe('StrikeButton.vue', (): void => {
    test('should mount successfully', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        StrikeButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render with correct icon', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        StrikeButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('icon')).toBe('mdi-format-strikethrough');
    });

    test('should show active state when strike is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        StrikeButton,
        'strike',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });
  });

  describe('BulletListButton.vue', (): void => {
    test('should mount successfully', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BulletListButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render with correct icon', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BulletListButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('icon')).toBe('mdi-format-list-bulleted');
    });

    test('should show active state when bullet list is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        BulletListButton,
        'bulletList',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });
  });

  describe('OrderedListButton.vue', (): void => {
    test('should mount successfully', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        OrderedListButton,
      );

      expect(wrapper.exists()).toBe(true);
    });

    test('should render with correct icon', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        OrderedListButton,
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('icon')).toBe('mdi-format-list-numbered');
    });

    test('should show active state when ordered list is active', (): void => {
      const { wrapper }: { wrapper: any } = setupButton(
        OrderedListButton,
        'orderedList',
      );

      const baseButton: VueWrapper<any> = wrapper.findComponent({ name: 'TextEditorBaseButton' });
      expect(baseButton.props('active')).toBe(true);
    });
  });
});
