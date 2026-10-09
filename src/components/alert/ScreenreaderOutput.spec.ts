import { mount } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import ScreenreaderOutput from './ScreenreaderOutput.vue';

type OutputWrapper = ReturnType<typeof mount<typeof ScreenreaderOutput>>;

describe('ScreenreaderOutput', (): void => {
  const setup = (): { wrapper: OutputWrapper; message: Ref<string> } => {
    document.body.innerHTML = '<div id="app"></div>';
    const message: Ref<string> = ref('');
    const wrapper: OutputWrapper = mount(ScreenreaderOutput, {
      attachTo: document.getElementById('app') || '',
      slots: {
        default: () => message.value,
      },
    });

    return { wrapper, message };
  };

  test('renders an empty visually hidden output', (): void => {
    const { wrapper }: { wrapper: OutputWrapper } = setup();

    expect(wrapper.element.tagName).toBe('OUTPUT');
    expect(wrapper.attributes('role')).toBeUndefined();
    expect(wrapper.classes()).toContain('d-sr-only');
    expect(wrapper.text()).toBe('');
  });

  test('updates slot text without replacing the output', async (): Promise<void> => {
    const { wrapper, message }: { wrapper: OutputWrapper; message: Ref<string> } = setup();

    const outputElement: Element = wrapper.get('output').element;

    message.value = 'Saved successfully';
    await nextTick();

    expect(wrapper.text()).toBe('Saved successfully');
    expect(wrapper.get('output').element).toBe(outputElement);

    message.value = '';
    await nextTick();

    expect(wrapper.text()).toBe('');
    expect(wrapper.get('output').element).toBe(outputElement);
  });
});
