import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import ServiceProviderSuccessTemplate from './SuccessTemplate.vue';

let wrapper: VueWrapper | null = null;

type SuccessDataItem = {
  label: string;
  value: string;
  testId: string;
  type?: 'image' | 'text';
};

type SuccessDetails = {
  message: string;
  followingDataChanged: string;
  data: Array<SuccessDataItem>;
};
type Props = {
  success: SuccessDetails;
  showToServiceProviderDetailsButton: boolean;
  showBackButton: boolean;
  showCreateAnotherButton: boolean;
  toServiceProviderDetailsButtonText: string;
  toServiceProviderDetailsButtonTestId: string;
};
const defaultProps: Props = {
  success: {
    message: 'Service provider updated successfully',
    followingDataChanged: 'The following data was changed:',
    data: [
      { label: 'Name', value: 'Test Provider', testId: 'success-name' },
      { label: 'Email', value: 'test@example.com', testId: 'success-email' },
    ],
  },
  showToServiceProviderDetailsButton: true,
  showBackButton: true,
  showCreateAnotherButton: true,
  toServiceProviderDetailsButtonText: 'Go to Details',
  toServiceProviderDetailsButtonTestId: 'to-details-button',
};

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('ServiceProviderSuccessTemplate', () => {
  test('displays the success message correctly', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('Service provider updated successfully');
  });

  test('displays the success icon', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    const icon: VueWrapper<Element> = wrapper.findComponent({ name: 'VIcon' });
    expect(icon.exists()).toBe(true);
  });

  test('displays the "following data changed" message', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('The following data was changed:');
  });

  test('displays all changed data items with labels and values', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('Name:');
    expect(wrapper.get('[data-testid="success-name"]').text()).toBe('Test Provider');

    expect(wrapper.text()).toContain('Email:');
    expect(wrapper.get('[data-testid="success-email"]').text()).toBe('test@example.com');
  });

  test('renders image when type is image and value is provided', () => {
    const propsWithLogo: Props = {
      ...defaultProps,
      success: {
        ...defaultProps.success,
        data: [{ label: 'Logo', value: 'https://example.com/logo.png', testId: 'success-logo', type: 'image' }],
      },
    };

    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: propsWithLogo,
    });

    const img: VueWrapper<Element> = wrapper.findComponent({ name: 'VImg' });
    expect(img.exists()).toBe(true);
  });

  test('renders text when type is not image', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    const nameSpan: Omit<DOMWrapper<Element>, 'exists'> = wrapper.get('[data-testid="success-name"]');
    expect(nameSpan.element.tagName).toBe('SPAN');
    expect(nameSpan.text()).toBe('Test Provider');
  });

  test('shows "to service provider details" button when prop is true', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    const button: DOMWrapper<Element> = wrapper.find('[data-testid="to-details-button"]');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('Go to Details');
  });

  test('hides "to service provider details" button when prop is false', () => {
    const propsWithoutButton: Props = {
      ...defaultProps,
      showToServiceProviderDetailsButton: false,
    };

    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: propsWithoutButton,
    });

    const button: DOMWrapper<Element> = wrapper.find('[data-testid="to-details-button"]');
    expect(button.exists()).toBe(false);
  });

  test('emits "toServiceProviderDetails" event when button is clicked', async () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    const button: Omit<DOMWrapper<Element>, 'exists'> = wrapper.get('[data-testid="to-details-button"]');
    await button.trigger('click');

    expect(wrapper.emitted('toServiceProviderDetails')).toBeTruthy();
    expect(wrapper.emitted('toServiceProviderDetails')?.[0]).toEqual([]);
  });

  test('handles empty changedData array', () => {
    const propsWithoutData: Props = {
      ...defaultProps,
      success: {
        ...defaultProps.success,
        data: [],
      },
    };

    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: propsWithoutData,
    });

    expect(wrapper.text()).toContain('Service provider updated successfully');
    expect(wrapper.text()).toContain('The following data was changed:');
  });

  test('displays divider element', () => {
    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: defaultProps,
    });

    const divider: VueWrapper<Element> = wrapper.findComponent({ name: 'VDivider' });
    expect(divider.exists()).toBe(true);
  });

  test('handles multiple items in changedData', () => {
    const propsWithMultipleItems: Props = {
      ...defaultProps,
      success: {
        ...defaultProps.success,
        data: [
          { label: 'Field 1', value: 'Value 1', testId: 'field-1' },
          { label: 'Field 2', value: 'Value 2', testId: 'field-2' },
          { label: 'Field 3', value: 'Value 3', testId: 'field-3' },
        ],
      },
    };

    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: propsWithMultipleItems,
    });

    expect(wrapper.get('[data-testid="field-1"]').text()).toBe('Value 1');
    expect(wrapper.get('[data-testid="field-2"]').text()).toBe('Value 2');
    expect(wrapper.get('[data-testid="field-3"]').text()).toBe('Value 3');
  });

  test('applies pre-line class to success message', () => {
    const multilineMessage: string = 'Line 1\nLine 2\nLine 3';
    const propsWithMultilineMessage: Props = {
      ...defaultProps,
      success: {
        ...defaultProps.success,
        message: multilineMessage,
      },
    };

    wrapper = mount(ServiceProviderSuccessTemplate, {
      attachTo: document.getElementById('app') || '',
      props: propsWithMultilineMessage,
    });

    const messageElement: DOMWrapper<Element> = wrapper.find('.pre-line');
    expect(messageElement.exists()).toBe(true);
    expect(messageElement.text()).toBe(multilineMessage);
  });
});
