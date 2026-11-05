import {
  TokenKind,
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { nextTick, type Component } from 'vue';
import TwoFactorAuthenticationSetUp from './TwoFactorAuthenticationSetUp.vue';

let wrapper: VueWrapper<InstanceType<typeof TwoFactorAuthenticationSetUp>> | null = null;
let twoFactorAuthenticationStore: TwoFactorAuthentificationStore;

beforeEach(async () => {
  twoFactorAuthenticationStore = useTwoFactorAuthentificationStore();
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(TwoFactorAuthenticationSetUp, {
    attachTo: document.getElementById('app') || '',
    props: {
      isLoading: false,
      disabled: false,
      errorCode: '',
      person: DoFactory.getPersonendatensatz(),
    },
    global: {
      components: {
        TwoFactorAuthenticationSetUp: TwoFactorAuthenticationSetUp as Component,
      },
    },
  });
  await flushPromises();
});

describe('set up two-factor authentication', () => {
  test('it opens the dialog', async () => {
    const button: Omit<DOMWrapper<Element>, 'exists'> | undefined = wrapper?.get(
      '[data-testid="open-2FA-dialog-icon"]',
    );
    expect(button).not.toBeNull();
    await button!.trigger('click');
    await nextTick();

    const softwareTokenRadio: Element | null = document.querySelector('[data-testid="software-token-radio-button"]');
    const hardwareTokenRadio: Element | null = document.querySelector('[data-testid="hardware-token-radio-button"]');

    expect(softwareTokenRadio).not.toBeNull();
    expect(hardwareTokenRadio).not.toBeNull();
  });

  test('it selects the software token option by default', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();

    const selectedOption: HTMLInputElement | null = document.querySelector(
      '[data-testid="software-token-radio-button"] input',
    );
    expect(selectedOption?.checked).toBe(true);
  });

  test('it switches to the hardware token option when selected', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();

    const hardwareTokenRadio: HTMLInputElement | null = document.querySelector(
      '[data-testid="hardware-token-radio-button"] input',
    );

    hardwareTokenRadio!.checked = true;
    await nextTick();

    expect(hardwareTokenRadio!.checked).toBe(true);
  });

  test('it proceeds with the selected software token option', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();

    const proceedButton: Element | null = document.querySelector(
      '[data-testid="proceed-two-factor-authentication-dialog-button"]',
    );
    expect(proceedButton).not.toBeNull();
    const proceedButtonElement: DOMWrapper<Element> = new DOMWrapper(proceedButton);
    await proceedButtonElement.trigger('click');
    await flushPromises();
    expect(document.querySelector('[data-testid="layout-card-headline"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="layout-card-headline"]')?.textContent).toBe(
      'Software-Token einrichten',
    );
  });

  test('it proceeds with the selected hardware token option', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();

    const hardwareTokenRadio: HTMLInputElement | null = document.querySelector(
      '[data-testid="hardware-token-radio-button"] input',
    );

    const hardwareTokenRadioElement: DOMWrapper<Element> = new DOMWrapper(hardwareTokenRadio);
    await hardwareTokenRadioElement.trigger('click');
    await nextTick();

    const proceedButton: Element | null = document.querySelector(
      '[data-testid="proceed-two-factor-authentication-dialog-button"]',
    );
    expect(proceedButton).not.toBeNull();
    const proceedButtonElement: DOMWrapper<Element> = new DOMWrapper(proceedButton);
    await proceedButtonElement.trigger('click');
    await nextTick();
    expect(document.querySelector('[data-testid="layout-card-headline"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="layout-card-headline"]')?.textContent).toBe('Hardware-Token zuordnen');
  });

  test('it closes the dialog when the cancel button is clicked', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();
    const cancelButton: Element | null = document.querySelector(
      '[data-testid="close-two-factor-authentication-dialog-button"]',
    );
    expect(cancelButton).not.toBeNull();
    const cancelButtonElement: DOMWrapper<Element> = new DOMWrapper(cancelButton);
    await cancelButtonElement.trigger('click');
    await nextTick();

    const overlayContent: Element | null = document.querySelector('.v-overlay__content');
    expect(overlayContent).not.toBeNull();
    expect(getComputedStyle(overlayContent!).display).toBe('none');
  });

  test('resets 2FA store state when the dialog is closed after initiating token setup', async () => {
    const button: DOMWrapper<HTMLButtonElement> = wrapper!.find('[data-testid="open-2FA-dialog-icon"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    await nextTick();
    twoFactorAuthenticationStore.qrCode = 'testQR';
    twoFactorAuthenticationStore.hasToken = true;
    twoFactorAuthenticationStore.tokenKind = TokenKind.software;
    const proceedButton: Element | null = document.querySelector(
      '[data-testid="proceed-two-factor-authentication-dialog-button"]',
    );
    expect(proceedButton).not.toBeNull();
    const proceedButtonElement: DOMWrapper<Element> = new DOMWrapper(proceedButton);
    await proceedButtonElement.trigger('click');
    await nextTick();
    expect(document.querySelector('[data-testid="two-factor-authentication-dialog"]')).not.toBeNull();
    const closeButton: Element | null = document.querySelector('[data-testid="close-software-token-dialog-button"]');
    expect(closeButton).not.toBeNull();
    const cancelButtonElement: DOMWrapper<Element> = new DOMWrapper(closeButton);
    await cancelButtonElement.trigger('click');
    await nextTick();

    const overlayContent: Element | null = document.querySelector('.v-overlay__content');
    expect(overlayContent).not.toBeNull();
    expect(getComputedStyle(overlayContent!).display).toBe('none');
    expect(twoFactorAuthenticationStore.qrCode).toEqual('');
    expect(twoFactorAuthenticationStore.hasToken).toBe(null);
    expect(twoFactorAuthenticationStore.tokenKind).toBe(null);
  });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});
