import type { OrganisationResponseLegacy, RolleResponse, SystemRechtResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';
import type { Person } from '@/stores/types/Person';
import { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { test, type MockInstance } from 'vitest';
import { nextTick } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import RolleModify from './RolleModify.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
const bulkOperationStore: BulkOperationStore = useBulkOperationStore();
const person: Person = DoFactory.getPerson({ id: 'test' });

const organisation: OrganisationResponseLegacy = DoFactory.getOrganisationenResponseLegacy();
const rolle: RolleResponse = DoFactory.getRolleResponse({
  administeredBySchulstrukturknoten: organisation.id,
  rollenart: RollenArt.Lehr,
});

const rolleLern: RolleResponse = DoFactory.getRolleResponse({
  administeredBySchulstrukturknoten: organisation.id,
  rollenart: RollenArt.Lern,
});

const kopersRolle: RolleResponse = DoFactory.getRolleResponse({
  administeredBySchulstrukturknoten: organisation.id,
  merkmale: [RollenMerkmal.KopersPflicht],
  systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
  rollenart: RollenArt.Lern,
});

beforeEach(async () => {
  // Create a container for the app and append it to the document body
  const appContainer: HTMLDivElement = document.createElement('div');
  appContainer.id = 'app';
  document.body.appendChild(appContainer);

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  await router.push('/');
  await router.isReady();

  wrapper = mount(RolleModify, {
    attachTo: appContainer,
    props: {
      isLoading: false,
      errorCode: '',
      isDialogVisible: true,
      selectedPersonen: new Map([
        ['test', new PersonWithZuordnungen(person, [DoFactory.getZuordnung({ sskName: '1a' })])],
      ]),
      organisationen: [
        { title: organisation.name, value: organisation.id },
        { title: 'orga1', value: '1133' },
      ],
      rollen: [
        {
          value: rolle.id,
          title: rolle.name,
          merkmale: rolle.merkmale,
          rollenart: rolle.rollenart,
        },
        {
          value: kopersRolle.id,
          title: kopersRolle.name,
          merkmale: kopersRolle.merkmale,
          rollenart: kopersRolle.rollenart,
        },
        {
          value: rolleLern.id,
          title: rolleLern.name,
          merkmale: rolleLern.merkmale,
          rollenart: rolleLern.rollenart,
        },
      ],
    },
    global: {
      plugins: [router],
    },
  });

  await nextTick();
});
personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse({
  organisations: [organisation],
  rollen: [rolle, kopersRolle],
  canCommit: true,
});

describe('RolleModify', () => {
  test('renders form and triggers submit', async () => {
    bulkOperationStore.bulkModifyPersonenRolle = vi.fn().mockResolvedValue(undefined);
    const bulkModifyPersonenRolleSpy: MockInstance = vi.spyOn(bulkOperationStore, 'bulkModifyPersonenRolle');
    // Set organisation value
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue(organisation.id);
    organisationAutocomplete?.vm.$emit('update:search', organisation.id);
    await nextTick();

    // Set rolle value
    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue(rolle.id);
    rolleAutocomplete?.vm.$emit('update:search', rolle.id);
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    const formElement: Element | null = document.querySelector('[data-testid="rolle-assign-form"]');
    expect(formElement).not.toBeNull();

    if (formElement) {
      // Dispatch a submit event directly on the form element
      formElement.dispatchEvent(new Event('submit'));
    }

    // Wait for all promises to resolve
    await vi.waitFor(() => expect(bulkModifyPersonenRolleSpy).toHaveBeenCalledTimes(1));
  });

  test('shows error dialog if bulk operation has errors', async () => {
    // Mock the bulk operation with an error
    bulkOperationStore.currentOperation = {
      type: null,
      isRunning: false,
      progress: 0,
      complete: false,
      errors: new Map([['someId', 'Some error message']]),
      data: new Map(),
      successMessage: '',
    };

    // Set organisation value
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue('O1');
    organisationAutocomplete?.vm.$emit('update:search', 'O1');
    await nextTick();

    // Set rolle value
    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue('54321');
    rolleAutocomplete?.vm.$emit('update:search', '54321');
    await nextTick();

    const befristungInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'befristung-input-wrapper' })
      .findComponent({ ref: 'befristung-input' });
    await befristungInput?.setValue('12.08.2099');
    await nextTick();

    // Find the form correctly
    expect(wrapper).not.toBeNull();

    const formElement: Element | null = document.querySelector('[data-testid="rolle-assign-form"]');
    expect(formElement).not.toBeNull();

    if (formElement) {
      // Dispatch a submit event directly on the form element
      formElement.dispatchEvent(new Event('submit'));
    }

    // Wait for all promises to resolve
    await new Promise((resolve: (value: unknown) => void) => {
      setTimeout(resolve, 0);
    });
    await flushPromises();

    // Check for error dialog
    const errorDialog: Element | null = document.body.querySelector('.v-dialog');
    expect(errorDialog).not.toBeNull();
  });

  test('renders the dialog when isDialogVisible is true', async () => {
    await nextTick();

    // Find the teleported content in the document body
    const dialogContent: Element | null = document.body.querySelector('[data-testid="rolle-modify-layout-card"]');
    expect(dialogContent).not.toBeNull();

    // Find buttons within the teleported content
    const discardButton: Element | null = document.body.querySelector('[data-testid="rolle-modify-discard-button"]');
    const submitButton: Element | null = document.body.querySelector('[data-testid="rolle-modify-submit-button"]');

    expect(discardButton).not.toBeNull();
    expect(submitButton).not.toBeNull();

    expect(document.querySelector('[data-testid="rolle-modify-layout-card"]')).not.toBeNull();
  });

  test('renders the hint when selected rolle has KOPERS_PFLICHT', async () => {
    // Set organisation value
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue(organisation.id);
    organisationAutocomplete?.vm.$emit('update:search', organisation.id);
    await nextTick();

    // Set rolle value
    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue(kopersRolle.id);
    rolleAutocomplete?.vm.$emit('update:search', kopersRolle.id);
    await nextTick();

    const kopersInfo: Element | null = document.body.querySelector('[data-testid="no-kopersnr-information"]');

    expect(kopersInfo).not.toBeNull();
    expect(kopersInfo?.textContent).toContain('KoPers.-Nr.');
  });

  test('renders the dialog when isDialogVisible is true', () => {
    // Find the teleported content in the document body
    const dialogContent: Element | null = document.body.querySelector('[data-testid="rolle-modify-layout-card"]');
    expect(dialogContent).not.toBeNull();

    // Find buttons within the teleported content
    const discardButton: Element | null = document.body.querySelector('[data-testid="rolle-modify-discard-button"]');
    const submitButton: Element | null = document.body.querySelector('[data-testid="rolle-modify-submit-button"]');

    expect(discardButton).not.toBeNull();
    expect(submitButton).not.toBeNull();

    expect(document.querySelector('[data-testid="rolle-modify-layout-card"]')).not.toBeNull();
  });

  test('renders the dialog when isDialogVisible and closes it', () => {
    const dialogContent: Element | null = document.body.querySelector('[data-testid="rolle-modify-layout-card"]');
    expect(dialogContent).not.toBeNull();

    const discardButton: Element | null = document.body.querySelector('[data-testid="rolle-modify-discard-button"]');

    expect(discardButton).not.toBeNull();

    if (discardButton) {
      discardButton.dispatchEvent(new Event('click'));
    }
  });

  test('shows error dialog when showErrorDialog is true', async () => {
    await nextTick();

    // Manually set showErrorDialog to true
    (wrapper?.vm as unknown as { showErrorDialog: boolean }).showErrorDialog = true;

    await nextTick();

    const errorDialog: VueWrapper | undefined = wrapper?.findComponent({ name: 'PersonBulkError' });
    expect(errorDialog?.exists()).toBe(true);
  });

  it('handles klassen option changes', async () => {
    const organisationAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'personenkontext-create-organisation-select' });
    await organisationAutocomplete?.setValue(organisation.id);
    organisationAutocomplete?.vm.$emit('update:search', organisation.id);
    await nextTick();

    const rolleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .findComponent({ ref: 'rolle-select' });
    await rolleAutocomplete?.setValue(rolleLern.id);
    rolleAutocomplete?.vm.$emit('update:search', rolleLern.id);
    await nextTick();

    const keepKlasseRadioButton: DOMWrapper<HTMLInputElement> | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .find('[data-testid="keep-klasse-radio-button"] input[type="radio"]');
    const changeKlasseRadioButton: DOMWrapper<HTMLInputElement> | undefined = wrapper
      ?.findComponent({ ref: 'personenkontext-create' })
      .find('[data-testid="select-new-klasse-radio-button"] input[type="radio"]');

    expect(keepKlasseRadioButton?.element.checked).toBe(true);

    await changeKlasseRadioButton?.trigger('click');
    await nextTick();

    expect(keepKlasseRadioButton?.element.checked).toBe(false);
    expect(changeKlasseRadioButton?.element.checked).toBe(true);
  });
});
