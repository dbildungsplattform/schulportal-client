import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import ZuordnungConfirmationDialog from './ZuordnungConfirmationDialog.vue';

describe('ZuordnungConfirmationDialog', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  function mountDialog(confirmFirst: boolean): VueWrapper<InstanceType<typeof ZuordnungConfirmationDialog>> {
    return mount(ZuordnungConfirmationDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        header: 'Confirmation',
        confirmButtonTestId: 'confirmation-button',
        confirmFirst,
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
  }

  function getAnswerButtons(dialog: VueWrapper): DOMWrapper<Element>[] {
    return dialog.findAll('button').filter((button: DOMWrapper<Element>) => ['Ja', 'Nein'].includes(button.text()));
  }

  type ConfirmationCase = { confirmFirst: boolean; order: string[] };

  test.each<ConfirmationCase>([
    { confirmFirst: true, order: ['Ja', 'Nein'] },
    { confirmFirst: false, order: ['Nein', 'Ja'] },
  ])('it emits confirm and cancel (confirmFirst=$confirmFirst)', async ({ confirmFirst, order }: ConfirmationCase) => {
    wrapper = mountDialog(confirmFirst);

    const buttons: DOMWrapper<Element>[] = getAnswerButtons(wrapper);
    expect(buttons.map((button: DOMWrapper<Element>) => button.text())).toEqual(order);

    await wrapper.get('[data-testid="confirmation-button"]').trigger('click');
    await buttons[order.indexOf('Nein')]?.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  test('it emits cancel when the card is closed', async () => {
    wrapper = mountDialog(false);

    await wrapper.get('[data-testid="close-layout-card-button"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });
});
