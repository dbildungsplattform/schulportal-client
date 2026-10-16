import { mount, type VueWrapper } from '@vue/test-utils';
import { VDivider } from 'vuetify/components';
import SPSHDivider from './SpshDivider.vue';

let wrapper: VueWrapper | null = null;

beforeEach((): void => {
  document.body.innerHTML = '<div id="app"></div>';
  wrapper = mount(SPSHDivider, {
    attachTo: document.getElementById('app') || '',
  });
});

afterEach((): void => {
  wrapper?.unmount();
});

describe('SPSHDivider', (): void => {
  test('it preserves the divider styling', (): void => {
    expect(wrapper?.getComponent(VDivider).props('color')).toBe('#E5EAEF');
    expect(wrapper?.getComponent(VDivider).props('thickness')).toBe('6');
    expect(wrapper?.get('[data-testid="spsh-divider"]').classes()).toEqual(
      expect.arrayContaining(['border-opacity-100', 'rounded', 'my-6']),
    );
  });
});
