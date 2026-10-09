import { mount } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import ScreenreaderStatus from './ScreenreaderStatus.vue';

type StatusWrapper = ReturnType<typeof mount<typeof ScreenreaderStatus>>;

describe('ScreenreaderStatus', (): void => {
  const setup = (): { wrapper: StatusWrapper; message: Ref<string> } => {
    document.body.innerHTML = '<div id="app"></div>';
    const message: Ref<string> = ref('');
    const wrapper: StatusWrapper = mount(ScreenreaderStatus, {
      attachTo: document.getElementById('app') || '',
      slots: {
        default: () => message.value,
      },
    });

    return { wrapper, message };
  };

  test('renders an empty visually hidden status region', (): void => {
    const { wrapper }: { wrapper: StatusWrapper } = setup();

    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.classes()).toContain('d-sr-only');
    expect(wrapper.text()).toBe('');
  });

  test('updates slot text without replacing the status region', async (): Promise<void> => {
    const { wrapper, message }: { wrapper: StatusWrapper; message: Ref<string> } = setup();

    const statusRegion: Element = wrapper.get('[role="status"]').element;

    message.value = 'Saved successfully';
    await nextTick();

    expect(wrapper.text()).toBe('Saved successfully');
    expect(wrapper.get('[role="status"]').element).toBe(statusRegion);

    message.value = '';
    await nextTick();

    expect(wrapper.text()).toBe('');
    expect(wrapper.get('[role="status"]').element).toBe(statusRegion);
  });
});
