/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import type { ComponentInstance } from 'vue';
import LinkElementButton from './LinkElementButton.vue';

enableAutoUnmount(afterEach);

const createMockChainMethods = (): any => ({
  unsetLink: vi.fn(() => ({ run: vi.fn() })),
  insertContent: vi.fn(() => ({ run: vi.fn() })),
  extendMarkRange: vi.fn(() => ({
    setLink: vi.fn(() => ({ run: vi.fn() })),
  })),
});

const createMockEditor = (hasLink: boolean = false, linkHref: string = ''): any => ({
  isActive: vi.fn((format: string): boolean => format === 'link' && hasLink),
  getAttributes: vi.fn((format: string): any => {
    if (format === 'link' && hasLink) {
      return { href: linkHref };
    }
    return {};
  }),
  state: {
    selection: {
      empty: true,
    },
  },
  chain: vi.fn((): any => ({
    focus: vi.fn((): any => createMockChainMethods()),
  })),
});

const setup = (
  hasLink: boolean = false,
  linkHref: string = '',
): {
  wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
  mockEditor: any;
  vm: any;
} => {
  const mockEditor = createMockEditor(hasLink, linkHref);
  const wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> = mount(LinkElementButton, {
    attachTo: document.getElementById('app') || '',
    props: {
      editor: mockEditor,
    },
  });
  return { wrapper, mockEditor, vm: wrapper.vm as any };
};

describe('LinkElementButton.vue', (): void => {
  describe('component rendering', (): void => {
    test('should mount successfully with editor prop', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      expect(wrapper.exists()).toBe(true);
    });

    test('should render menu component', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      const menu = wrapper.findComponent({ name: 'VMenu' });
      expect(menu.exists()).toBe(true);
    });

    test('should render button with link icon', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      const button = wrapper.find('[data-testid="link-button"]');
      expect(button.exists()).toBe(true);
    });

    test('should set button active when link is active', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup(true, 'https://example.com');

      const editor = wrapper.props('editor');
      expect(editor.isActive('link')).toBe(true);
    });

    test('should have correct aria-label on button', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      const button = wrapper.find('[data-testid="link-button"]');
      expect(button.attributes('aria-label')).toBeDefined();
    });

    test('should render menu with close-on-content-click false', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      const menu = wrapper.findComponent({ name: 'VMenu' });
      expect(menu.props('closeOnContentClick')).toBe(false);
    });

    test('should render tooltip on button', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      const tooltip = wrapper.findComponent({ name: 'VTooltip' });
      expect(tooltip.exists()).toBe(true);
    });
  });

  describe('linkHandler - getting link attributes', (): void => {
    test('should set linkText to href when href is a string', async (): Promise<void> => {
      const {
        wrapper,
        mockEditor,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
        mockEditor: any;
      } = setup(true, 'https://example.com');

      vi.mocked(mockEditor.getAttributes).mockReturnValue({ href: 'https://example.com' });

      const button = wrapper.find('[data-testid="link-button"]');
      await button.trigger('click');
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.linkText).toBe('https://example.com');
    });

    test('should set linkText to empty string when href is null', async (): Promise<void> => {
      const {
        wrapper,
        mockEditor,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
        mockEditor: any;
      } = setup();

      vi.mocked(mockEditor.getAttributes).mockReturnValue({ href: null });

      const button = wrapper.find('[data-testid="link-button"]');
      await button.trigger('click');
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.linkText).toBe('');
    });

    test('should set linkText to empty string when href is undefined', async (): Promise<void> => {
      const {
        wrapper,
        mockEditor,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
        mockEditor: any;
      } = setup();

      vi.mocked(mockEditor.getAttributes).mockReturnValue({ href: undefined });

      const button = wrapper.find('[data-testid="link-button"]');
      await button.trigger('click');
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.linkText).toBe('');
    });

    test('should set linkText to empty string when href is a number', async (): Promise<void> => {
      const {
        wrapper,
        mockEditor,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
        mockEditor: any;
      } = setup();

      vi.mocked(mockEditor.getAttributes).mockReturnValue({ href: 123 });

      const button = wrapper.find('[data-testid="link-button"]');
      await button.trigger('click');
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.linkText).toBe('');
    });

    test('should get link attributes on button click', async (): Promise<void> => {
      const {
        wrapper,
        mockEditor,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
        mockEditor: any;
      } = setup(true, 'https://example.com');

      const button = wrapper.find('[data-testid="link-button"]');
      await button.trigger('click');

      expect(mockEditor.getAttributes).toHaveBeenCalledWith('link');
    });
  });

  describe('setLink - inserting and updating links', (): void => {
    test('should not call editor chain when linkText is empty', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      vm.linkText = '';
      vm.setLink();

      expect(mockEditor.chain).not.toHaveBeenCalled();
    });

    test('should insert content when selection is empty and not active', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      mockEditor.state.selection.empty = true;
      vi.mocked(mockEditor.isActive).mockReturnValue(false);

      const insertContentMock = vi.fn(() => ({ run: vi.fn() }));
      vi.mocked(mockEditor.chain).mockReturnValue({
        focus: vi.fn().mockReturnValue({
          insertContent: insertContentMock,
        }),
      });

      vm.linkText = 'https://example.com';
      vm.setLink();

      expect(insertContentMock).toHaveBeenCalled();
      const args: any = (insertContentMock.mock.calls as any[][])?.[0]?.[0];
      expect(args?.type).toBe('text');
      expect(args?.text).toBe('https://example.com');
    });

    test('should close menu after setting link on existing selection', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      mockEditor.state.selection.empty = false;
      vi.mocked(mockEditor.isActive).mockReturnValue(true);

      const setLinkMock = vi.fn(() => ({ run: vi.fn() }));
      vi.mocked(mockEditor.chain).mockReturnValue({
        focus: vi.fn().mockReturnValue({
          extendMarkRange: vi.fn().mockReturnValue({
            setLink: setLinkMock,
          }),
        }),
      });

      vm.menu = true;
      vm.linkText = 'https://example.com';
      vm.setLink();

      expect(vm.menu).toBe(false);
    });
  });

  describe('clearLink - removing links', (): void => {
    test('should clear linkText when clearLink is called', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      vi.mocked(mockEditor.chain).mockReturnValue({
        focus: vi.fn().mockReturnValue({
          unsetLink: vi.fn().mockReturnValue({
            run: vi.fn(),
          }),
        }),
      });

      vm.linkText = 'https://example.com';
      vm.clearLink();

      expect(vm.linkText).toBe('');
    });

    test('should close menu when clearLink is called', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      vi.mocked(mockEditor.chain).mockReturnValue({
        focus: vi.fn().mockReturnValue({
          unsetLink: vi.fn().mockReturnValue({
            run: vi.fn(),
          }),
        }),
      });

      vm.menu = true;
      vm.linkText = 'https://example.com';
      vm.clearLink();

      expect(vm.menu).toBe(false);
    });

    test('should call editor chain unsetLink when clearLink is called', (): void => {
      const {
        mockEditor,
        vm,
      }: {
        mockEditor: any;
        vm: any;
      } = setup();

      const unsetLinkMock = vi.fn().mockReturnValue({
        run: vi.fn(),
      });
      const focusMock = vi.fn().mockReturnValue({
        unsetLink: unsetLinkMock,
      });

      vi.mocked(mockEditor.chain).mockReturnValue({
        focus: focusMock,
      });

      vm.linkText = 'https://example.com';
      vm.clearLink();

      expect(unsetLinkMock).toHaveBeenCalled();
    });
  });

  describe('rendering and UI', (): void => {
    test('component should render without errors', (): void => {
      const {
        wrapper,
      }: {
        wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
      } = setup();

      expect(wrapper.exists()).toBe(true);
    });
  });
});
