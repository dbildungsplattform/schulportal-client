import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungFormActions from './ZuordnungFormActions.vue';

describe('ZuordnungFormActions', () => {
  enableAutoUnmount(afterEach);

  const setup = (): { wrapper: VueWrapper<InstanceType<typeof ZuordnungFormActions>> } => {
    const wrapper: VueWrapper<InstanceType<typeof ZuordnungFormActions>> = mount(ZuordnungFormActions, {
      props: { cancelButtonTestId: 'form-cancel-button' },
      slots: { default: '<button data-testid="form-submit-button">Submit</button>' },
    });

    return { wrapper };
  };

  test('it renders the submit slot and emits cancel', async () => {
    const { wrapper }: ReturnType<typeof setup> = setup();

    expect(wrapper.find('[data-testid="form-submit-button"]').exists()).toBe(true);

    await wrapper.get('[data-testid="form-cancel-button"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
