import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungInfoDialog from './ZuordnungInfoDialog.vue';

describe('ZuordnungInfoDialog', () => {
  enableAutoUnmount(afterEach);

  const setup = (
    props: { header: string; closeButtonTestId?: string },
    message: string,
  ): { wrapper: VueWrapper<InstanceType<typeof ZuordnungInfoDialog>> } => {
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungInfoDialog>> = mount(ZuordnungInfoDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        ...props,
      },
      slots: {
        message,
      },
      global: {
        stubs: {
          VDialog: { template: '<div><slot /></div>' },
        },
      },
    });

    return { wrapper };
  };

  test('it renders the message and emits close', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup(
      { header: 'Success', closeButtonTestId: 'success-close-button' },
      'Success message',
    );

    expect(wrapper.text()).toContain('Success message');
    await wrapper.get('[data-testid="success-close-button"]').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  test('it emits close when the card is closed', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup({ header: 'Info' }, 'Info message');

    await wrapper.get('[data-testid="close-layout-card-button"]').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
