import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { type ComponentInstance } from 'vue';
import { createVuetify } from 'vuetify';
import { VBtn } from 'vuetify/components';
import SuccessTemplateBaseButton from './SuccessTemplateBaseButton.vue';

enableAutoUnmount(afterEach);

const setup = (
  appearance: 'primary' | 'secondary' = 'primary',
): {
  wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateBaseButton>>;
  vuetify: ReturnType<typeof createVuetify>;
} => {
  const vuetify: ReturnType<typeof createVuetify> = createVuetify();
  const wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateBaseButton>> = mount(SuccessTemplateBaseButton, {
    attachTo: document.getElementById('app') || '',
    global: { plugins: [vuetify] },
    props: { appearance, testId: 'test-button' },
    slots: { default: 'Continue' },
  });
  return { wrapper, vuetify };
};

describe('SuccessTemplateBaseButton', (): void => {
  test.each(['primary', 'secondary'] as const)(
    'should render the label and ID with %s appearance',
    (appearance: 'primary' | 'secondary'): void => {
      const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateBaseButton>> } =
        setup(appearance);

      expect(wrapper.get('[data-testid="test-button"]').text()).toBe('Continue');
      expect(wrapper.getComponent(VBtn).classes()).toContain(appearance);
    },
  );

  test('should update appearance and ID when props change', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateBaseButton>> } = setup();
    await wrapper.setProps({ appearance: 'secondary', testId: 'updated-button' });

    expect(wrapper.get('[data-testid="updated-button"]').classes()).toContain('secondary');
    expect(wrapper.getComponent(VBtn).classes()).not.toContain('primary');
    expect(wrapper.find('[data-testid="test-button"]').exists()).toBe(false);
  });

  test('should emit one click when the button is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateBaseButton>> } = setup();
    await wrapper.get('[data-testid="test-button"]').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
