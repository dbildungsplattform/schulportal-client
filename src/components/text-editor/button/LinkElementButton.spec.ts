/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import LinkElementButton from './LinkElementButton.vue';

enableAutoUnmount(afterEach);

const createMockEditor = (hasLink: boolean = false, linkHref: string = ''): any => {
  return {
    isActive: (format: string): boolean => format === 'link' && hasLink,
    getAttributes: (format: string): any => {
      if (format === 'link' && hasLink) {
        return { href: linkHref };
      }
      return {};
    },
    state: {
      selection: {
        empty: true,
      },
    },
    chain: (): any => ({
      focus: (): any => ({
        unsetLink: (): any => ({ run: (): void => {} }),
        insertContent: (): any => ({ run: (): void => {} }),
        extendMarkRange: (): any => ({
          setLink: (): any => ({ run: (): void => {} }),
        }),
      }),
    }),
  };
};

const setup = (hasLink: boolean = false, linkHref: string = ''): {
  wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>>;
} => {
  const mockEditor: any = createMockEditor(hasLink, linkHref);
  const wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> = mount(LinkElementButton, {
    attachTo: document.getElementById('app') || '',
    props: {
      editor: mockEditor,
    },
  });
  return { wrapper };
};

describe('LinkElementButton.vue', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
  });

  test('should mount successfully with editor prop', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    expect(wrapper.exists()).toBe(true);
  });

  test('should render menu component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    const menu = wrapper.findComponent({ name: 'VMenu' });
    expect(menu.exists()).toBe(true);
  });

  test('should render button with link icon', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    const button = wrapper.find('[data-testid="link-button"]');
    expect(button.exists()).toBe(true);
  });

  test('should set button active when link is active', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup(
      true,
      'https://example.com',
    );

    const editor: any = (wrapper.props('editor'));
    expect(editor.isActive('link')).toBe(true);
  });

  test('should have correct aria-label on button', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    const button = wrapper.find('[data-testid="link-button"]');
    expect(button.attributes('aria-label')).toBeDefined();
  });

  test('should render menu with close-on-content-click false', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    const menu = wrapper.findComponent({ name: 'VMenu' });
    expect(menu.props('closeOnContentClick')).toBe(false);
  });

  test('should render tooltip on button', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup();

    const tooltip = wrapper.findComponent({ name: 'VTooltip' });
    expect(tooltip.exists()).toBe(true);
  });

  test('should get link attributes on button click', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof LinkElementButton>> } = setup(
      true,
      'https://example.com',
    );

    const button = wrapper.find('[data-testid="link-button"]');
    await button.trigger('click');

    const editor: any = (wrapper.props('editor'));
    expect(editor.getAttributes('link')).toEqual({ href: 'https://example.com' });
  });
});
