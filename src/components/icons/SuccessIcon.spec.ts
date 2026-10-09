import { mount, type VueWrapper } from '@vue/test-utils';
import { VIcon } from 'vuetify/components';
import SuccessIcon from './SuccessIcon.vue';

let wrapper: VueWrapper | null = null;

beforeEach((): void => {
  document.body.innerHTML = '<div id="app"></div>';
  wrapper = mount(SuccessIcon, {
    attachTo: document.getElementById('app') || '',
  });
});

afterEach((): void => {
  wrapper?.unmount();
});

describe('SuccessIcon', (): void => {
  test('it preserves the success icon attributes', (): void => {
    expect(wrapper?.getComponent(VIcon).props('icon')).toBe('mdi-check-circle');
    expect(wrapper?.getComponent(VIcon).props('color')).toBe('#1EAE9C');
    expect(wrapper?.get('[data-testid="success-icon"]').attributes('small')).toBe('');
  });
});
