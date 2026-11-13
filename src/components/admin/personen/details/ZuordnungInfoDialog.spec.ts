import { mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungInfoDialog from './ZuordnungInfoDialog.vue';

describe('ZuordnungInfoDialog', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it renders the message and emits close', async () => {
    wrapper = mount(ZuordnungInfoDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        header: 'Success',
        closeButtonTestId: 'success-close-button',
      },
      slots: {
        message: 'Success message',
      },
      global: {
        stubs: {
          VDialog: { template: '<div><slot /></div>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Success message');
    await wrapper.get('[data-testid="success-close-button"]').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
