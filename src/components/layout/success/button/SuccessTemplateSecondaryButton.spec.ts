import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { type ComponentInstance } from 'vue';
import { createVuetify } from 'vuetify';
import { VBtn } from 'vuetify/components';
import SuccessTemplateSecondaryButton from './SuccessTemplateSecondaryButton.vue';

enableAutoUnmount(afterEach);

const setup = (): {
  wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateSecondaryButton>>;
  vuetify: ReturnType<typeof createVuetify>;
} => {
  const vuetify: ReturnType<typeof createVuetify> = createVuetify();
  const wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateSecondaryButton>> = mount(
    SuccessTemplateSecondaryButton,
    {
      global: { plugins: [vuetify] },
      slots: { default: 'Back to list' },
    },
  );
  return { wrapper, vuetify };
};

describe('SuccessTemplateSecondaryButton', (): void => {
  test('should render the label with fixed secondary appearance and test ID', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateSecondaryButton>> } = setup();
    const button: Omit<VueWrapper<ComponentInstance<typeof VBtn>>, 'exists'> = wrapper.getComponent(VBtn);

    expect(wrapper.get('[data-testid="success-template-secondary-button"]').text()).toBe('Back to list');
    expect(button.classes()).toContain('secondary');
    expect(button.classes()).not.toContain('primary');
  });

  test('should emit one click when the button is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplateSecondaryButton>> } = setup();
    await wrapper.get('[data-testid="success-template-secondary-button"]').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
