import { DOMWrapper, mount, VueWrapper } from '@vue/test-utils';
import { expect, test, describe, vi, beforeEach, type Mock } from 'vitest';
import NoSecondFactor from './NoSecondFactorView.vue';
import { nextTick } from 'vue';

let wrapper: VueWrapper | null = null;

const locationMock: Mock = vi.fn(() => ({
  pathname: 'test',
  href: vi.fn(),
}));

vi.stubGlobal('location', locationMock);

beforeEach(() => {
  wrapper = mount(NoSecondFactor, {
    props: {
      buttonText: 'Back',
      closable: false,
      modelValue: true,
      showButton: true,
      text: 'Second factor authentication is required',
      title: 'Two-Factor Authentication',
      type: 'error',
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  });
});

describe('SpshAlert Component', () => {
  test('it renders the correct title and text', () => {
    expect(wrapper?.find('[data-testid$="alert-title"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid$="alert-text"]').exists()).toBe(true);
  });

  test('it renders the back button with correct text', () => {
    const backbutton: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find('[data-testid$="alert-button"]');

    if (!backbutton) {
      return;
    }
    expect(backbutton.exists()).toBe(true);
    expect(backbutton.text()).toBe('Back');
  });

  test('it triggers goBack action when back button is clicked', async () => {
    const alertButton: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find('[data-testid$="alert-button"]');
    await alertButton?.trigger('click');
    await nextTick();

    expect(window.location.href).toBe('/start');
  });

  test('it renders the second factor setup button', () => {
    const setupButton: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find(
      '[data-testid="toSecondFactorSetup-button"]',
    );
    expect(setupButton!.exists()).toBe(true);
  });

  test('it triggers toSecondFactorSetup when setup button is clicked', async () => {
    const toSecondFactorSetupMock: Mock = vi.fn();
    await wrapper?.setProps({ buttonAction: toSecondFactorSetupMock });

    const setupButton: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find(
      '[data-testid="toSecondFactorSetup-button"]',
    );
    await setupButton?.trigger('click');
    await nextTick();
    expect(window.location.href).toBe('/profile');
  });
});
