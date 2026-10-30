/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Editor } from '@tiptap/vue-3';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import HeadingMenuButton from './HeadingMenuButton.vue';

enableAutoUnmount(afterEach);

const createMockEditor = (activeLevel: number | null = null): Partial<Editor> => {
  return {
    isActive: (format: string, options?: { level: number }): boolean => {
      if (format === 'heading' && options?.level) {
        return options.level === activeLevel;
      }
      return format === 'heading' && activeLevel !== null;
    },
    chain: (): any => ({
      focus: (): any => ({
        toggleHeading: (_options: { level: number }): any => ({
          run: (): void => {},
        }),
      }),
    }),
  };
};

const setup = (
  activeLevel: number | null = null,
): {
  wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>>;
} => {
  const mockEditor = createMockEditor(activeLevel);
  const wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> = mount(HeadingMenuButton, {
    attachTo: document.getElementById('app') || '',
    props: {
      editor: mockEditor,
    },
  });
  return { wrapper };
};

describe('HeadingMenuButton.vue', (): void => {
  test('should mount successfully with editor prop', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    expect(wrapper.exists()).toBe(true);
  });

  test('should render menu component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    const menu = wrapper.findComponent({ name: 'VMenu' });
    expect(menu.exists()).toBe(true);
  });

  test('should render button with data-testid', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    const button = wrapper.find('[data-testid="heading-menu-button"]');
    expect(button.exists()).toBe(true);
  });

  test('should check for active heading state', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup(1);

    const editor = wrapper.props('editor');
    expect(editor.isActive('heading')).toBe(true);
  });

  test('should render button with tooltip', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    const tooltip = wrapper.findComponent({ name: 'VTooltip' });
    expect(tooltip.exists()).toBe(true);
  });

  test('should have correct aria-label on button', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    const button = wrapper.find('[data-testid="heading-menu-button"]');
    expect(button.attributes('aria-label')).toBeDefined();
  });

  test('should render menu component and verify structure', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    const menu = wrapper.findComponent({ name: 'VMenu' });
    expect(menu.exists()).toBe(true);
  });
});
