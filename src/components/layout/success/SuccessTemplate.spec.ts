import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import SPSHDivider from '@/components/layout/SpshDivider.vue';
import { enableAutoUnmount, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { h, type ComponentInstance, type VNode } from 'vue';
import SuccessTemplate from './SuccessTemplate.vue';

enableAutoUnmount(afterEach);

const setup = (icon?: () => VNode[]): { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplate>> } => {
  const wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplate>> = mount(SuccessTemplate, {
    slots: {
      message: '<span data-testid="test-message">Success</span>',
      description: '<span data-testid="test-description">Details</span>',
      default: '<div data-testid="test-details">Individual content</div>',
      actions: '<button data-testid="test-action">Continue</button>',
      ...(icon ? { icon } : {}),
    },
  });

  return { wrapper };
};

describe('SuccessTemplate', (): void => {
  test('should render slots, default icon and divider in order', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplate>> } = setup();

    expect(wrapper.findComponent(SuccessIcon).exists()).toBe(true);
    expect(wrapper.findAllComponents(SPSHDivider)).toHaveLength(1);
    expect(
      wrapper
        .findAll('[data-testid]')
        .map((element: DOMWrapper<Element>): string | undefined => element.attributes('data-testid')),
    ).toEqual(['test-message', 'success-icon', 'test-description', 'test-details', 'spsh-divider', 'test-action']);
    expect(wrapper.get('[data-testid="test-message"]').text()).toBe('Success');
    expect(wrapper.get('[data-testid="test-description"]').text()).toBe('Details');
    expect(wrapper.get('[data-testid="test-details"]').text()).toBe('Individual content');
  });

  test('should replace the default icon through the icon slot', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof SuccessTemplate>> } = setup((): VNode[] => [
      h('span', { 'data-testid': 'custom-icon' }, 'Custom icon'),
    ]);

    expect(wrapper.findComponent(SuccessIcon).exists()).toBe(false);
    expect(wrapper.get('[data-testid="custom-icon"]').text()).toBe('Custom icon');
  });
});
