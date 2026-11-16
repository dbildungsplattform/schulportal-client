import { mount, type VueWrapper } from '@vue/test-utils';
import ZuordnungFormActions from './ZuordnungFormActions.vue';

describe('ZuordnungFormActions', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it renders the submit slot and emits cancel', async () => {
    wrapper = mount(ZuordnungFormActions, {
      props: { cancelButtonTestId: 'form-cancel-button' },
      slots: { default: '<button data-testid="form-submit-button">Submit</button>' },
    });

    expect(wrapper.find('[data-testid="form-submit-button"]').exists()).toBe(true);

    await wrapper.get('[data-testid="form-cancel-button"]').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
