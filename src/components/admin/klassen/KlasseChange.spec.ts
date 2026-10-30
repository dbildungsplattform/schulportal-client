import type { Organisation } from '@/stores/OrganisationStore';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test } from 'vitest';
import { nextTick, type Component } from 'vue';
import KlasseChange from './KlasseChange.vue';

let wrapper: VueWrapper | null = null;
const schulen: Array<{ value: string; title: string }> = [
  {
    value: '1',
    title: 'Schule 1',
  },
  {
    value: '2',
    title: 'Schule 2',
  },
];

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(KlasseChange, {
    attachTo: document.getElementById('app') || '',
    props: {
      schulen,
      readonly: false,
      selectedSchuleProps: {
        error: false,
        'error-messages': [],
        onBlur: () => vi.fn(),
        onChange: () => vi.fn(),
        onInput: () => vi.fn(),
      },
      selectedNewKlasseProps: {
        error: false,
        'error-messages': [],
        onBlur: () => vi.fn(),
        onChange: () => vi.fn(),
        onInput: () => vi.fn(),
      },
      isEditActive: true,
      onSubmit: () => vi.fn(),
    },
    global: {
      components: {
        KlasseChange: KlasseChange as Component,
      },
    },
  });
});

afterEach(() => {
  wrapper?.unmount();
  vi.clearAllTimers();
  vi.clearAllMocks();
});

describe('KlasseChange', () => {
  test('it renders the component', () => {
    expect(wrapper?.find('[data-testid="klasse-change-form"]').isVisible()).toBe(true);
  });

  test('it selects values and emits submit event', async () => {
    await wrapper?.findComponent({ ref: 'schule-select' }).setValue('2');
    await wrapper?.find('[data-testid="schule-select"]').trigger('change');
    await nextTick();

    const klasse: Organisation = DoFactory.getKlasse();
    await wrapper
      ?.findComponent({ name: 'KlassenFilter' })
      .findComponent({ ref: 'klasse-change-klasse-select' })
      .setValue(klasse);
    await flushPromises();
    expect(wrapper?.emitted('update:selectedNewKlasse')).toContainEqual([klasse]);
    await wrapper
      ?.findComponent({ name: 'KlassenFilter' })
      .findComponent({ ref: 'klasse-change-klasse-select' })
      .trigger('change');

    await wrapper?.find('[data-testid="klasse-change-form"]').trigger('submit');
    expect(wrapper?.emitted('submit')).toBeTruthy();
  });

  test('Do nothing with Klassen if the orga was reset', async () => {
    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' });
    await organisationAutocomplete?.setValue('1');
    await nextTick();

    const klassenAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ name: 'KlassenFilter' })
      .findComponent({ ref: 'klasse-change-klasse-select' });
    klassenAutocomplete?.vm.$emit('update:search', '');
    await nextTick();

    await organisationAutocomplete?.setValue(undefined);
    await nextTick();

    expect(klassenAutocomplete?.text()).toBeFalsy();
  });

  test('Make sure selected organisation is sent to KlassenFilter', async () => {
    const organisationAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'schule-select' });
    await organisationAutocomplete?.setValue('1');
    await nextTick();

    const klassenAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ name: 'KlassenFilter' });
    expect(klassenAutocomplete?.props()).toEqual(expect.objectContaining({ administriertVon: ['1'] }));
  });
});
