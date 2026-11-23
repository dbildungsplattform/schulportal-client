import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungFormActions from './ZuordnungFormActions.vue';

type FormActionsSetup = { wrapper: VueWrapper<InstanceType<typeof ZuordnungFormActions>> };

describe('ZuordnungFormActions', () => {
  enableAutoUnmount(afterEach);

  const setup = (): FormActionsSetup => {
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungFormActions>> = mount(ZuordnungFormActions, {
      props: { cancelButtonTestId: 'form-cancel-button' },
      slots: { default: '<button data-testid="form-submit-button">Submit</button>' },
    });

    return { wrapper };
  };

  test('it renders the submit slot and emits cancel', async () => {
    const { wrapper }: FormActionsSetup = setup();

    expect(wrapper.find('[data-testid="form-submit-button"]').exists()).toBe(true);

    await wrapper.get('[data-testid="form-cancel-button"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
