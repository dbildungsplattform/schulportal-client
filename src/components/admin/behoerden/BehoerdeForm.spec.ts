import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test } from 'vitest';
import type { Component } from 'vue';
import BehoerdeForm from './BehoerdeForm.vue';

let wrapper: VueWrapper | null = null;
const organisationStore: OrganisationStore = useOrganisationStore();

const zustaendigkeitsbereichList: Array<Organisation> = [
  DoFactory.getOrganisation({
    id: '9257685',
    name: 'Öffentliche Schulen',
    typ: OrganisationsTyp.Traeger,
  }),
  DoFactory.getOrganisation({
    id: '3568865',
    name: 'Ersatzschulen',
    typ: OrganisationsTyp.Traeger,
  }),
];

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(BehoerdeForm, {
    attachTo: document.getElementById('app') || '',
    props: {
      isLoading: false,
      initialValues: {
        selectedZustaendigkeitsbereich: zustaendigkeitsbereichList[0]!.id,
        selectedBehoerdenname: '',
        selectedDienststellennummer: '',
      },
      zustaendigkeitsbereichList,
    },
    global: {
      components: {
        BehoerdeForm: BehoerdeForm as Component,
      },
    },
  });
  organisationStore.$reset();
});

afterEach((): void => {
  wrapper?.unmount();
});

describe('BehoerdeForm', () => {
  test('it renders the Behoerde form', () => {
    expect(wrapper?.find('[data-testid="behoerde-form"]').isVisible()).toBe(true);
  });

  test('it renders a radio button for each Zustaendigkeitsbereich', () => {
    expect(wrapper?.find('[data-testid="zustaendigkeitsbereich-radio-button-öffentliche-schulen"]').exists()).toBe(
      true,
    );
    expect(wrapper?.find('[data-testid="zustaendigkeitsbereich-radio-button-ersatzschulen"]').exists()).toBe(true);
  });

  test('it names the Zustaendigkeitsbereich radio group using its heading', (): void => {
    expect(wrapper?.get('[role="radiogroup"]').attributes('aria-labelledby')).toBe(
      'behoerde-zustaendigkeitsbereich-heading',
    );
    expect(wrapper?.get('#behoerde-zustaendigkeitsbereich-heading').text()).toBe('1. Zuständigkeitsbereich zuordnen');
  });

  test('it renders the optional Dienststellennummer input', () => {
    expect(wrapper?.find('[data-testid="behoerde-dienststellennummer-input"]').exists()).toBe(true);
  });

  test('the initial selection does not make the form dirty', async (): Promise<void> => {
    await flushPromises();
    expect(wrapper?.emitted('update:dirty')?.at(-1)).toEqual([false]);
    expect(wrapper?.get('[data-testid="behoerde-form-submit-button"]').attributes('disabled')).toBeDefined();
  });

  test('changing and restoring the name updates whole-form dirty state', async (): Promise<void> => {
    await wrapper?.get('[data-testid="behoerdenname-input"] input').setValue('Test Behoerde');
    await flushPromises();
    expect(wrapper?.emitted('update:dirty')?.at(-1)).toEqual([true]);
    await wrapper?.get('[data-testid="behoerdenname-input"] input').setValue('');
    await flushPromises();
    expect(wrapper?.emitted('update:dirty')?.at(-1)).toEqual([false]);
  });

  test('submits validated values without a Dienststellennummer', async (): Promise<void> => {
    await wrapper?.get('[data-testid="behoerdenname-input"] input').setValue('Test Behoerde');
    await wrapper?.get('[data-testid="behoerde-form"]').trigger('submit');
    await flushPromises();
    await vi.waitFor((): void => expect(wrapper?.emitted('click:submit')).toBeTruthy());
    expect(wrapper?.emitted('click:submit')?.[0]).toEqual([
      {
        selectedZustaendigkeitsbereich: zustaendigkeitsbereichList[0]!.id,
        selectedBehoerdenname: 'Test Behoerde',
        selectedDienststellennummer: '',
      },
    ]);
  });

  test('restores cached values as unsaved changes', async (): Promise<void> => {
    wrapper?.unmount();
    wrapper = mount(BehoerdeForm, {
      attachTo: document.getElementById('app') || '',
      props: {
        isLoading: false,
        zustaendigkeitsbereichList,
        initialValues: {
          selectedZustaendigkeitsbereich: zustaendigkeitsbereichList[0]!.id,
          selectedBehoerdenname: '',
          selectedDienststellennummer: '',
        },
        cachedValues: {
          selectedZustaendigkeitsbereich: zustaendigkeitsbereichList[1]!.id,
          selectedBehoerdenname: 'Cached Behoerde',
          selectedDienststellennummer: '123',
        },
      },
    });
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('[data-testid="behoerdenname-input"] input').element.value).toBe(
      'Cached Behoerde',
    );
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true]);
  });
});
