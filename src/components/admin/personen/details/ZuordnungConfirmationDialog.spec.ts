import { enableAutoUnmount, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import ZuordnungConfirmationDialog from './ZuordnungConfirmationDialog.vue';

describe('ZuordnungConfirmationDialog', () => {
  enableAutoUnmount(afterEach);

  const setup = (confirmFirst: boolean): { wrapper: VueWrapper<InstanceType<typeof ZuordnungConfirmationDialog>> } => {
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungConfirmationDialog>> = mount(ZuordnungConfirmationDialog, {
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
    return { wrapper };
  };

  const getAnswerButtons = (
    dialog: VueWrapper<InstanceType<typeof ZuordnungConfirmationDialog>>,
  ): DOMWrapper<Element>[] => {
    return dialog.findAll('button').filter((button: DOMWrapper<Element>) => ['Ja', 'Nein'].includes(button.text()));
  };

  const expectConfirmAndCancel = async (confirmFirst: boolean, order: string[]): Promise<void> => {
    const { wrapper }: ReturnType<typeof setup> = setup(confirmFirst);

    const buttons: DOMWrapper<Element>[] = getAnswerButtons(wrapper);
    expect(buttons.map((button: DOMWrapper<Element>) => button.text())).toEqual(order);

    await wrapper.get('[data-testid="confirmation-button"]').trigger('click');
    await buttons[order.indexOf('Nein')]?.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  };

  describe('when the confirm button comes first', () => {
    test('it emits confirm and cancel', async () => {
      await expectConfirmAndCancel(true, ['Ja', 'Nein']);
    });
  });

  describe('when the cancel button comes first', () => {
    test('it emits confirm and cancel', async () => {
      await expectConfirmAndCancel(false, ['Nein', 'Ja']);
    });
  });

  test('it emits cancel when the card is closed', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup(false);

    await wrapper.get('[data-testid="close-layout-card-button"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });
});
