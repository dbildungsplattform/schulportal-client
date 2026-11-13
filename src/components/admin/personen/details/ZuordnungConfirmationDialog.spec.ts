import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import ZuordnungConfirmationDialog from './ZuordnungConfirmationDialog.vue';

describe('ZuordnungConfirmationDialog', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it emits confirm and cancel in the configured button order', async () => {
    wrapper = mount(ZuordnungConfirmationDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        header: 'Confirmation',
        confirmButtonTestId: 'confirmation-button',
        confirmFirst: true,
      },
      slots: {
        message: 'Confirmation message',
      },
      global: {
        stubs: {
          VDialog: { template: '<div><slot /></div>' },
        },
      },
    });

    const buttons: DOMWrapper<Element>[] = wrapper
      .findAll('button')
      .filter((button: DOMWrapper<Element>) => ['Ja', 'Nein'].includes(button.text()));
    expect(buttons.map((button: DOMWrapper<Element>) => button.text())).toEqual(['Ja', 'Nein']);

    await wrapper.get('[data-testid="confirmation-button"]').trigger('click');
    await buttons[1]?.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
