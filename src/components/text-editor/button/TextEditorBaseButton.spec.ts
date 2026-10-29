/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/typedef */
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import TextEditorBaseButton from './TextEditorBaseButton.vue';

enableAutoUnmount(afterEach);

const setup = (active: boolean = false): {
  wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>>;
} => {
  const wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> = mount(
    TextEditorBaseButton,
    {
      attachTo: document.getElementById('app') || '',
      props: {
        icon: 'mdi-format-bold',
        tooltip: 'Bold',
        testId: 'bold-button',
        active,
      },
    },
  );
  return { wrapper };
};

describe('TextEditorBaseButton.vue', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
  });

  test('should mount successfully', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup();

    expect(wrapper.exists()).toBe(true);
  });

  test('should render button with correct testId', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup();

    const button: any = wrapper.find('[data-testid="bold-button"]');
    expect(button.exists()).toBe(true);
  });

  test.each([true, false])(
    'should have correct aria-pressed when %s',
    (active: boolean): void => {
      const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup(
        active,
      );

      const button = wrapper.find('[data-testid="bold-button"]');
      expect(button.attributes('aria-pressed')).toBe(active.toString());
    },
  );

  test('should emit click event on button click', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup();

    const button = wrapper.find('[data-testid="bold-button"]');
    await button.trigger('click');

    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  test('should have correct aria-label', (): void => {
    const wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> = mount(
      TextEditorBaseButton,
      {
        attachTo: document.getElementById('app') || '',
        props: {
          icon: 'mdi-format-bold',
          tooltip: 'Make text bold',
          testId: 'bold-button',
          active: false,
        },
      },
    );

    const button = wrapper.find('[data-testid="bold-button"]');
    expect(button.attributes('aria-label')).toBe('Make text bold');
  });

  test('should update active state when prop changes', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup(
      false,
    );

    await wrapper.setProps({ active: true });

    const button = wrapper.find('[data-testid="bold-button"]');
    expect(button.attributes('aria-pressed')).toBe('true');
  });

  test('should render tooltip component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof TextEditorBaseButton>> } = setup();

    const tooltip = wrapper.findComponent({ name: 'VTooltip' });
    expect(tooltip.exists()).toBe(true);
  });
});
