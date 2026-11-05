import { mount, type VueWrapper } from '@vue/test-utils';
import { VIcon } from 'vuetify/components';
import SuccessIcon from './SuccessIcon.vue';

describe('SuccessIcon', (): void => {
  test('it preserves the success icon attributes', (): void => {
    const wrapper: VueWrapper | null = mount(SuccessIcon);

    expect(wrapper?.getComponent(VIcon).props('icon')).toBe('mdi-check-circle');
    expect(wrapper?.get('[data-testid="success-icon"]').attributes('small')).toBe('');

    wrapper?.unmount();
  });
});
