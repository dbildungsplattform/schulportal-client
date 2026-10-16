import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { type ComponentInstance } from 'vue';
import { createVuetify } from 'vuetify';
import { VBtn } from 'vuetify/components';
import SuccessTemplatePrimaryButton from './SuccessTemplatePrimaryButton.vue';

enableAutoUnmount(afterEach);

afterEach((): void => {
  vi.unstubAllGlobals();
});

const setup = (): {
  wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplatePrimaryButton>>;
  vuetify: ReturnType<typeof createVuetify>;
} => {
  const vuetify: ReturnType<typeof createVuetify> = createVuetify();
  const wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplatePrimaryButton>> = mount(
    SuccessTemplatePrimaryButton,
    {
      global: { plugins: [vuetify] },
      slots: { default: 'Create another' },
    },
  );

  return { wrapper, vuetify };
};

describe('SuccessTemplatePrimaryButton', (): void => {
  test('should render the label with fixed primary appearance and test ID', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplatePrimaryButton>> } = setup();
    const button: Omit<VueWrapper<ComponentInstance<typeof VBtn>>, 'exists'> = wrapper.getComponent(VBtn);

    expect(wrapper.get('[data-testid="success-template-primary-button"]').text()).toBe('Create another');
    expect(button.classes()).toContain('primary');
    expect(button.classes()).not.toContain('secondary');
  });

  test('should emit one click when the button is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplatePrimaryButton>> } = setup();
    await wrapper.get('[data-testid="success-template-primary-button"]').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
