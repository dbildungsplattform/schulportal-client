/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Editor } from '@tiptap/vue-3';
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import type { ComponentInstance } from 'vue';
import HeadingMenuButton from './HeadingMenuButton.vue';

enableAutoUnmount(afterEach);

const toggleHeadingSpy: ReturnType<typeof vi.fn> = vi.fn();

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
        toggleHeading: (options: { level: number }): any => {
          new toggleHeadingSpy(options);
          return { run: () => vi.fn() };
        },
      }),
    }),
  };
};

const setup = (
  activeLevel: number | null = null,
): {
  wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>>;
} => {
  toggleHeadingSpy.mockClear();
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

  test.each([
    [1, 'mdi-format-header-1'],
    [2, 'mdi-format-header-2'],
    [3, 'mdi-format-header-3'],
  ])('should show icon for active heading level %i', (level: number, icon: string): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup(level);

    const button = wrapper.findComponent({ name: 'VBtn' });
    expect(button.props('icon')).toBe(icon);
  });

  test('should show generic heading icon when no heading level is active', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup(null);

    const button = wrapper.findComponent({ name: 'VBtn' });
    expect(button.props('icon')).toBe('mdi-format-header-pound');
  });

  test('should set button active when a heading is active', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup(2);

    const button = wrapper.findComponent({ name: 'VBtn' });
    expect(button.props('active')).toBe(true);
  });

  test('should not set button active when no heading is active', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup(null);

    const button = wrapper.findComponent({ name: 'VBtn' });
    expect(button.props('active')).toBe(false);
  });

  test('should toggle the selected heading level when a list item is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HeadingMenuButton>> } = setup();

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click');
    await flushPromises();

    const listItems = wrapper.findAllComponents({ name: 'VListItem' });
    expect(listItems).toHaveLength(3);

    await listItems[1]!.trigger('click');

    expect(toggleHeadingSpy).toHaveBeenCalledWith({ level: 2 });
  });
});
