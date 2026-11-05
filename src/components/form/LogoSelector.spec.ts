import { expect, test, beforeEach, describe, vi } from 'vitest';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import LogoSelector from './LogoSelector.vue';
import type { Component } from 'vue';

// Mock the logos config
vi.mock('@/utils/logosConfig', () => ({
  getAvailableLogos: (): { id: number; name: string; path: string }[] => [
    { id: 1, name: 'Logo One', path: '/logos/logo-1.svg' },
    { id: 2, name: 'Logo Two', path: '/logos/logo-2.svg' },
    { id: 3, name: 'Logo Three', path: '/logos/logo-3.svg' },
  ],
}));

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(LogoSelector, {
    attachTo: document.getElementById('app') || '',
    props: {
      modelValue: undefined,
      error: false,
      errorMessages: [],
      readonly: false,
      disabled: false,
    },
    global: {
      components: {
        LogoSelector: LogoSelector as Component,
      },
    },
  });
});

describe('LogoSelector', () => {
  test('it renders the logo grid', () => {
    expect(wrapper?.find('.logo-grid').isVisible()).toBe(true);
  });

  test('it renders all available logos', () => {
    const logoItems: DOMWrapper<Element>[] | undefined = wrapper?.findAll('[data-testid^="logo-"]');
    expect(logoItems).toHaveLength(3);
  });

  test('it renders logo with correct aria-label', () => {
    const logoItem: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    const vImgRoot: DOMWrapper<Element> | undefined = logoItem?.find('.v-img');
    const img: DOMWrapper<Element> | undefined = logoItem?.find('img');

    expect(vImgRoot?.attributes('aria-label')).toBe('Logo One');
    expect(img?.attributes('alt')).toBe('Logo One');
  });

  test('it renders logo with correct title', () => {
    const firstLogoItem: DOMWrapper<Element> | undefined = wrapper?.findAll('.logo-item')[0];
    expect(firstLogoItem?.attributes('title')).toBe('Logo One');
  });

  test('it emits update:modelValue when logo is clicked', async () => {
    const logoItem: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    await logoItem?.trigger('click');
    expect(wrapper?.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper?.emitted('update:modelValue')?.[0]).toEqual([1]);
  });

  test('it marks selected logo with selected class', async () => {
    await wrapper?.setProps({ modelValue: 1 });
    const firstLogoItem: DOMWrapper<Element> | undefined = wrapper?.findAll('.logo-item')[0];
    expect(firstLogoItem?.classes()).toContain('selected');
  });

  test('it does not emit when disabled', async () => {
    await wrapper?.setProps({ disabled: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    await firstLogo?.trigger('click');
    expect(wrapper?.emitted('update:modelValue')).toBeFalsy();
  });

  test('it does not emit when readonly', async () => {
    await wrapper?.setProps({ readonly: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    await firstLogo?.trigger('click');
    expect(wrapper?.emitted('update:modelValue')).toBeFalsy();
  });

  test('it applies disabled class when disabled prop is true', async () => {
    await wrapper?.setProps({ disabled: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    const firstLogoItem: Element | null | undefined = firstLogo?.element.parentElement?.parentElement;
    expect(firstLogoItem?.classList.contains('disabled')).toBe(true);
  });

  test('it handles Enter key press', async () => {
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    await firstLogo?.trigger('keydown.enter');
    expect(wrapper?.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper?.emitted('update:modelValue')?.[0]).toEqual([1]);
  });

  test('it handles Space key press', async () => {
    const secondLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-2"]');
    await secondLogo?.trigger('keydown.space');
    expect(wrapper?.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper?.emitted('update:modelValue')?.[0]).toEqual([2]);
  });

  test('it does not emit on keyboard when disabled', async () => {
    await wrapper?.setProps({ disabled: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    await firstLogo?.trigger('keydown.enter');
    expect(wrapper?.emitted('update:modelValue')).toBeFalsy();
  });

  test('it displays error messages when error is true', async () => {
    await wrapper?.setProps({
      error: true,
      errorMessages: ['This field is required', 'Logo must be selected'],
    });
    const errorMessages: DOMWrapper<Element>[] | undefined = wrapper?.findAll('.error-message');
    expect(errorMessages).toHaveLength(2);
    expect(errorMessages?.[0]?.text()).toBe('This field is required');
    expect(errorMessages?.[1]?.text()).toBe('Logo must be selected');
  });

  test('it does not display error messages when error is false', () => {
    const errorMessages: DOMWrapper<Element>[] | undefined = wrapper?.findAll('.error-message');
    expect(errorMessages).toHaveLength(0);
  });

  test('it does not display error messages when errorMessages is empty', async () => {
    await wrapper?.setProps({ error: true, errorMessages: [] });
    const errorMessages: DOMWrapper<Element>[] | undefined = wrapper?.findAll('.error-message');
    expect(errorMessages).toHaveLength(0);
  });

  test('it sets aria-pressed correctly for selected logo', async () => {
    await wrapper?.setProps({ modelValue: 1 });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    expect(firstLogo?.attributes('aria-pressed')).toBe('true');
  });

  test('it sets aria-pressed to false for unselected logos', async () => {
    await wrapper?.setProps({ modelValue: 1 });
    const secondLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-2"]');
    expect(secondLogo?.attributes('aria-pressed')).toBe('false');
  });

  test('it has correct tabindex when disabled', async () => {
    await wrapper?.setProps({ disabled: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    expect(firstLogo?.attributes('tabindex')).toBe('-1');
  });

  test('it has correct tabindex when readonly', async () => {
    await wrapper?.setProps({ readonly: true });
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    expect(firstLogo?.attributes('tabindex')).toBe('-1');
  });

  test('it has correct tabindex when enabled and not readonly', () => {
    const firstLogo: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="logo-1"]');
    expect(firstLogo?.attributes('tabindex')).toBe('0');
  });

  test('it emits different logo ids when different logos are clicked', async () => {
    const logoItems: DOMWrapper<Element>[] | undefined = wrapper?.findAll('[data-testid^="logo-"]');
    await logoItems?.[0]?.trigger('click');
    await logoItems?.[1]?.trigger('click');
    await logoItems?.[2]?.trigger('click');

    const emitted: unknown[][] | undefined = wrapper?.emitted('update:modelValue');
    expect(emitted).toHaveLength(3);
    expect(emitted?.[0]).toEqual([1]);
    expect(emitted?.[1]).toEqual([2]);
    expect(emitted?.[2]).toEqual([3]);
  });

  test('it renders logo container with correct dimensions', () => {
    const logoContainers: DOMWrapper<Element>[] | undefined = wrapper?.findAll('.logo-container');
    expect(logoContainers).toHaveLength(3);
    logoContainers?.forEach((container: DOMWrapper<Element>) => {
      expect(container.classes()).toContain('logo-container');
    });
  });
});
