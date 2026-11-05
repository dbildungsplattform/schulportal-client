import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ServiceProviderDelete from './ServiceProviderDelete.vue';

type Wrapper = VueWrapper<InstanceType<typeof ServiceProviderDelete>>;

interface DefaultProps {
  modelValue: boolean;
  errorCode: string;
  serviceProviderId: string;
  serviceProviderName: string;
  isLoading: boolean;
}

const defaultProps: DefaultProps = {
  modelValue: true,
  errorCode: '',
  serviceProviderId: 'sp-123',
  serviceProviderName: 'Test Provider',
  isLoading: false,
};

function mountDialog(props: Partial<DefaultProps> = {}): Wrapper {
  return mount(ServiceProviderDelete, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        transition: false,
        'v-dialog': {
          name: 'v-dialog',
          template: `
            <div>
              <slot name="activator" :props="{}" />
              <slot name="default" :isActive="{ value: true }" />
            </div>
          `,
        },
      },
    },
  });
}

describe('ServiceProviderDelete.vue', () => {
  it('renders confirmation state by default', () => {
    const wrapper: Wrapper = mountDialog();

    expect(wrapper.find('[data-testid="service-provider-delete-confirmation-text"]').exists()).toBe(true);
    expect(wrapper.html()).toContain('Test Provider');
  });

  it('emits onDeleteServiceProvider when delete button is clicked', async () => {
    const wrapper: Wrapper = mountDialog();

    const btn: DOMWrapper<Element> = wrapper.find('[data-testid="service-provider-delete-button"]');

    expect(btn.exists()).toBe(true);

    await btn.trigger('click');

    expect(wrapper.emitted('onDeleteServiceProvider')).toBeTruthy();
    expect(wrapper.emitted('onDeleteServiceProvider')?.[0]).toEqual(['sp-123']);
  });

  it('shows success state after delete and emits onClose', async () => {
    const wrapper: Wrapper = mountDialog();

    await wrapper.find('[data-testid="service-provider-delete-button"]').trigger('click');
    await nextTick();

    const closeBtn: DOMWrapper<Element> = wrapper.find(
      '[data-testid="close-service-provider-delete-success-dialog-button"]',
    );

    expect(closeBtn.exists()).toBe(true);

    await closeBtn.trigger('click');

    expect(wrapper.emitted('onClose')).toBeTruthy();
  });

  it('disables delete button when loading', () => {
    const wrapper: Wrapper = mountDialog({ isLoading: true });

    const btn: DOMWrapper<Element> = wrapper.find('[data-testid="service-provider-delete-button"]');

    expect(btn.exists()).toBe(true);
    expect(btn.attributes('disabled')).toBeDefined();
  });
});
