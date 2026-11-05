import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import SelfServiceWorkflow from './SelfServiceWorkflow.vue';
import {
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import { nextTick, type Component } from 'vue';

describe('set up two-factor authentication', () => {
  let wrapper: VueWrapper | null = null;
  let twoFactorAuthenticationStore: TwoFactorAuthentificationStore;

  beforeAll(() => {
    twoFactorAuthenticationStore = useTwoFactorAuthentificationStore();
  });

  beforeEach(() => {
    document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

    wrapper = mount(SelfServiceWorkflow, {
      attachTo: document.getElementById('app') || '',
      props: {
        personId: '123',
      },
      global: {
        components: {
          SelfServiceWorkflow: SelfServiceWorkflow as Component,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  test('renders the component with the correct button', () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-self-service-dialog-icon"]');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('admin.person.twoFactorAuthentication.setUpShort');
  });

  test('walk-through', async () => {
    wrapper?.get('[data-testid="open-2FA-self-service-dialog-icon"]').trigger('click');
    await nextTick();

    expect(document.querySelector('[data-testid="self-service-dialog-info-text"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="self-service-dialog-warning-text"]')).not.toBeNull();

    const proceedButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="proceed-two-factor-authentication-dialog"]',
    )[0];
    proceedButton?.click();
    await nextTick();

    expect(twoFactorAuthenticationStore.get2FASoftwareQRCode).toHaveBeenCalled();

    expect(document.querySelector('[data-testid="self-service-dialog-qr-info-text"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="software-token-dialog-progress-bar"]')).not.toBeNull();

    twoFactorAuthenticationStore.qrCode = 'qrCode';
    await nextTick();

    expect(document.querySelector('[data-testid="software-token-dialog-qr-code"]')).not.toBeNull();

    proceedButton?.click();
    await nextTick();

    expect(document.querySelector('[data-testid="self-service-otp-entry-info-text"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="self-service-otp-input"]')).not.toBeNull();

    // VOtpInput (Vuetify 4) renders one <input> per digit box and drives its
    // internal model off `beforeinput`, not a plain `input` event with a
    // multi-char value — so each digit has to be dispatched to its own box.
    const otpBoxes: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>(
      '[data-testid="self-service-otp-input"] input',
    );

    // v4.1 field grouping: 6 aria-hidden decorative spacers + 1 real functional
    // input (autocomplete="one-time-code") that holds the whole code.
    const realOtpInput: HTMLInputElement | undefined = Array.from(otpBoxes).find((input: HTMLInputElement) =>
      input.classList.contains('v-otp-input__input'),
    );

    expect(realOtpInput).toBeDefined();

    realOtpInput!.value = '123456';
    realOtpInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    await nextTick();

    realOtpInput!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick();

    expect(twoFactorAuthenticationStore.verify2FAToken).toHaveBeenCalled();
  });

  test('check for error messages', async () => {
    wrapper?.get('[data-testid="open-2FA-self-service-dialog-icon"]').trigger('click');
    await nextTick();

    const proceedButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="proceed-two-factor-authentication-dialog"]',
    )[0];
    proceedButton?.click();
    twoFactorAuthenticationStore.errorCode = 'error';
    await nextTick();

    document.querySelector('[data-testid="self-service-token-init-error-text"]');
    expect(document.querySelector('[data-testid="self-service-token-init-error-text"]')).not.toBeNull();

    document.querySelector('[data-testid="proceed-two-factor-authentication-dialog"]');
    expect(document.querySelector('[data-testid="proceed-two-factor-authentication-dialog"]')).toBeNull();

    twoFactorAuthenticationStore.errorCode = '';
    proceedButton?.click();
    twoFactorAuthenticationStore.errorCode = 'error';

    await nextTick();

    proceedButton?.click();
    twoFactorAuthenticationStore.errorCode = 'error';
    await nextTick();

    document.querySelector('[data-testid="self-service-otp-error-text"]');
    expect(document.querySelector('[data-testid="self-service-otp-error-text"]')).not.toBeNull();
  });

  test('closes the dialog when close button is clicked', async () => {
    wrapper?.get('[data-testid="open-2FA-self-service-dialog-icon"]').trigger('click');
    await nextTick();

    const originalCloseButton: Element | null = document.querySelector(
      '[data-testid="close-two-factor-authentication-dialog"]',
    );
    expect(originalCloseButton).not.toBeNull();
    const originalCloseButtonWrapper: DOMWrapper<Element> = new DOMWrapper(originalCloseButton);
    await originalCloseButtonWrapper.trigger('click');
    await nextTick();
    const overlayContent: Element | null = document.querySelector('.v-overlay__content');
    expect(overlayContent).not.toBeNull();
    expect(getComputedStyle(overlayContent!).display).toBe('none');
  });
});
