import { OrganisationsTyp } from '@/api-client/generated';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { RollenArt, RollenSystemRecht } from '@/stores/RolleStore';
import { ServiceProviderKategorie, ServiceProviderMerkmal } from '@/stores/ServiceProviderStore';
import { extractAnbietenInMerkmale } from '@/utils/serviceProvider.helper.js';
import { DOMWrapper, enableAutoUnmount, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import type { ComponentInstance } from 'vue';
import ServiceProviderForm from './ServiceProviderForm.vue';
import type {
  ServiceProviderFormProps,
  ServiceProviderFormSubmitData,
  ServiceProviderForm as ServiceProviderFormType,
} from './types';

enableAutoUnmount(afterEach);

const defaultProps: ServiceProviderFormProps = {
  initialValues: {
    selectedOrganisationId: '',
    name: '',
    url: '',
    logoId: undefined,
    kategorie: ServiceProviderKategorie.Schulisch,
    nachtraeglichZuweisbar: true,
    verfuegbarFuerRollenerweiterung: true,
    anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
    requires2fa: false,
    rollenartenWhitelist: [],
  },
  systemrecht: RollenSystemRecht.AngeboteVerwalten,
  showUnsavedChangesDialog: false,
  loading: false,
  isEditMode: false,
};

function mountComponent(
  props: Partial<ServiceProviderFormProps> = {},
): VueWrapper<ComponentInstance<typeof ServiceProviderForm>> {
  return mount(ServiceProviderForm, {
    props: { ...defaultProps, ...props },
  });
}

describe('ServiceProviderForm', () => {
  beforeEach(() => {
    document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
    vi.restoreAllMocks();
  });

  test('renders all main form sections', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent();
    expect(wrapper.find('[data-testid="name-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="url-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kategorie-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nachtraeglich-zuweisbar-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="verfuegbar-fuer-rollenerweiterung-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="requires2fa-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="service-provider-display-merkmale-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rollenarten-whitelist-select"]').exists()).toBe(true);
  });

  test('shows no restriction text for empty rollenarten whitelist', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent();

    expect(wrapper.find('[data-testid="rollenarten-whitelist-select"] input').attributes('placeholder')).toBe(
      'Keine Einschränkungen',
    );
  });

  test('disables rollenarten whitelist when user lacks AngeboteVerwalten', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      systemrecht: RollenSystemRecht.AngeboteEingeschraenktVerwalten,
    });

    const disabledAttr: string | undefined = wrapper
      .find('[data-testid="rollenarten-whitelist-select"] input')
      .attributes('disabled');

    expect(disabledAttr).toBeDefined();
  });

  test('renders offering scope form text', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent();
    const formText: string = wrapper.text();

    expect(formText).toContain('Anbieten in');
    expect(formText).toContain('Schulische Angebotsverwaltung');
    expect(formText).toContain('Schulische Rollenverwaltung');
  });

  test('validates required fields', async () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent();
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('Der Name des Angebots muss angegeben werden.');
      expect(wrapper.html()).toContain('Die URL des Angebots muss angegeben werden.');
      expect(wrapper.html()).toContain('Die Ebene der Bereitstellung muss ausgewählt werden.');
    });
  });

  test('clicking test url button calls window.open', async () => {
    const openSpy: Mock = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues: { ...defaultProps.initialValues, url: 'example.com' },
    });
    await wrapper.find('[data-testid="url-test-button"]').trigger('click');
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });

  type FieldState = {
    testId: string;
    isEditMode: boolean;
    shouldBeDisabled: boolean;
  };

  const fieldStates: FieldState[] = [
    { testId: 'name-input', isEditMode: false, shouldBeDisabled: false },
    { testId: 'url-input', isEditMode: false, shouldBeDisabled: false },
    { testId: 'kategorie-select', isEditMode: false, shouldBeDisabled: false },
    { testId: 'nachtraeglich-zuweisbar-select', isEditMode: false, shouldBeDisabled: false },
    { testId: 'verfuegbar-fuer-rollenerweiterung-select', isEditMode: false, shouldBeDisabled: false },
    { testId: 'requires2fa-select', isEditMode: false, shouldBeDisabled: true },
    {
      testId: 'service-provider-display-merkmale-select',
      isEditMode: false,
      shouldBeDisabled: false,
    },
    {
      testId: 'rollenarten-whitelist-select',
      isEditMode: false,
      shouldBeDisabled: false,
    },
    { testId: 'name-input', isEditMode: true, shouldBeDisabled: false },
    { testId: 'url-input', isEditMode: true, shouldBeDisabled: false },
    { testId: 'kategorie-select', isEditMode: true, shouldBeDisabled: false },
    { testId: 'nachtraeglich-zuweisbar-select', isEditMode: true, shouldBeDisabled: true },
    { testId: 'verfuegbar-fuer-rollenerweiterung-select', isEditMode: true, shouldBeDisabled: false },
    { testId: 'requires2fa-select', isEditMode: true, shouldBeDisabled: true },
    {
      testId: 'service-provider-display-merkmale-select',
      isEditMode: true,
      shouldBeDisabled: false,
    },
    {
      testId: 'rollenarten-whitelist-select',
      isEditMode: true,
      shouldBeDisabled: false,
    },
  ];

  test.each(fieldStates)(
    'field $testId is disabled=$shouldBeDisabled when isEditMode=$isEditMode',
    ({ testId, isEditMode, shouldBeDisabled }: FieldState): void => {
      const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({ isEditMode });
      const attr: string | undefined = wrapper.find(`[data-testid="${testId}"] input`).attributes('disabled');
      if (shouldBeDisabled) {
        expect(attr).toBeDefined();
      } else {
        expect(attr).toBeUndefined();
      }
    },
  );

  test('defaults both anbieten-in-merkmale to true when verfuegbarFuerRollenerweiterung is true', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues: {
        ...defaultProps.initialValues,
        verfuegbarFuerRollenerweiterung: true,
      },
    });
    const anbietenInMerkmale: HTMLInputElement = wrapper.find(
      '[data-testid="service-provider-display-merkmale-select"] input',
    ).element as HTMLInputElement;
    expect(anbietenInMerkmale.value).toEqual('Schulische Angebotsverwaltung, Schulische Rollenverwaltung');
  });

  test('does not disable verfuegbar-fuer-rollenerweiterung-select in edit mode when user has AngeboteVerwalten', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      isEditMode: true,
      systemrecht: RollenSystemRecht.AngeboteVerwalten,
    });
    const disabledAttr: string | undefined = wrapper
      .find('[data-testid="verfuegbar-fuer-rollenerweiterung-select"] input')
      .attributes('disabled');
    expect(disabledAttr).toBeUndefined();
  });

  test('does not disable anbieten-merkmale selection in edit mode when user has AngeboteVerwalten and verfuegbarFuerRollenerweiterung is true', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      isEditMode: true,
      systemrecht: RollenSystemRecht.AngeboteVerwalten,
      initialValues: {
        ...defaultProps.initialValues,
        verfuegbarFuerRollenerweiterung: true,
      },
    });
    const anbietenInMerkmaleDisabledAttr: string | undefined = wrapper
      .find('[data-testid="service-provider-display-merkmale-select"] input')
      .attributes('disabled');
    expect(anbietenInMerkmaleDisabledAttr).toBeUndefined();
  });

  test('disables verfuegbar-fuer-rollenerweiterung-select and anbieten-merkmale selection when user lacks AngeboteVerwalten', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      systemrecht: RollenSystemRecht.AngeboteEingeschraenktVerwalten,
    });
    const verfuegbarDisabledAttr: string | undefined = wrapper
      .find('[data-testid="verfuegbar-fuer-rollenerweiterung-select"] input')
      .attributes('disabled');
    const anbietenInAttr: string | undefined = wrapper
      .find('[data-testid="service-provider-display-merkmale-select"] input')
      .attributes('disabled');
    expect(verfuegbarDisabledAttr).toBeDefined();
    expect(anbietenInAttr).toBeDefined();
  });

  test('disables and deselects merkmale when verfuegbarFuerRollenerweiterung is false', () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues: {
        ...defaultProps.initialValues,
        verfuegbarFuerRollenerweiterung: false,
      },
    });
    const anbietenInSchulischeAngebotsverwaltung: HTMLInputElement = wrapper.find(
      '[data-testid="service-provider-display-merkmale-select"] input',
    ).element as HTMLInputElement;
    expect(anbietenInSchulischeAngebotsverwaltung.value).toBe('');
    expect(anbietenInSchulischeAngebotsverwaltung.disabled).toBe(true);
  });

  test('deselects merkmale when verfuegbarFuerRollenerweiterung transitions from true to false', async () => {
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues: {
        ...defaultProps.initialValues,
        verfuegbarFuerRollenerweiterung: true,
      },
    });
    (wrapper.findComponent('[data-testid="verfuegbar-fuer-rollenerweiterung-select"]') as VueWrapper).vm.$emit(
      'update:modelValue',
      false,
    );
    await flushPromises();
    const anbietenInSchulischeAngebotsverwaltung: HTMLInputElement = wrapper.find(
      '[data-testid="service-provider-display-merkmale-select"] input',
    ).element as HTMLInputElement;
    expect(anbietenInSchulischeAngebotsverwaltung.value).toBe('');
  });

  test('emits correct payload on submit', async () => {
    const orgaStore: OrganisationStore = useOrganisationStore();
    const org: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Schule });
    orgaStore.organisationenFilters.set('service-provider-create', {
      filterResult: [org],
      loading: false,
      total: 1,
    });
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: org.id,
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: [],
      rollenartenWhitelist: [],
      requires2fa: false,
    };
    const newName: string = 'Updated Name';
    const newUrl: string = 'updated-url.com';

    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({ initialValues });
    await flushPromises();
    const schuleAutoComplete: ReturnType<VueWrapper['findComponent']> = wrapper
      .findComponent({ name: 'SchulenFilter' })
      .findComponent({
        name: 'v-autocomplete',
      });
    await schuleAutoComplete.setValue(org.id);
    // vi.runAllTimers();
    await flushPromises();

    await wrapper.find('input[id="name-input"]').setValue(newName);
    await wrapper.find('input[id="url-input"]').setValue(newUrl);

    const submitBtn: DOMWrapper<Element> = wrapper.find(
      '[data-testid="service-provider-create-form"] button[type="submit"]',
    );
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes()['disabled']).toBeUndefined();
    await submitBtn.trigger('click');
    // submit event is not triggered by click in test, so we trigger it manually
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.emitted('click:submit')).toBeTruthy();
    const emittedData: ServiceProviderFormSubmitData = wrapper
      .emitted('click:submit')
      ?.at(0)
      ?.at(0) as ServiceProviderFormSubmitData;
    expect(emittedData).toMatchObject({
      name: newName,
      url: `https://${newUrl}`,
      selectedOrganisation: org,
      kategorie: initialValues.kategorie,
      logoId: initialValues.logoId,
    });
  });

  test('includes anbieten-in-*-merkmale on submit when rollenerweiterung is enabled and both are selected', async () => {
    const orgaStore: OrganisationStore = useOrganisationStore();
    const org: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Schule });
    orgaStore.organisationenFilters.set('service-provider-create', {
      filterResult: [org],
      loading: false,
      total: 1,
    });
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: org.id,
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [],
      requires2fa: false,
    };
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({ initialValues });
    await flushPromises();
    const schuleAutoComplete: ReturnType<VueWrapper['findComponent']> = wrapper
      .findComponent({ name: 'SchulenFilter' })
      .findComponent({
        name: 'v-autocomplete',
      });
    await schuleAutoComplete.setValue(org.id);
    await flushPromises();

    const submitBtn: DOMWrapper<Element> = wrapper.find(
      '[data-testid="service-provider-create-form"] button[type="submit"]',
    );
    await submitBtn.trigger('click');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const emittedData: ServiceProviderFormSubmitData = wrapper
      .emitted('click:submit')
      ?.at(0)
      ?.at(0) as ServiceProviderFormSubmitData;
    expect(emittedData.merkmale).toEqual(
      expect.arrayContaining([
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ]),
    );
  });

  test('it opens warning dialog if rollenerweiterung is disabled on an existing service provider', async () => {
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: 'org-id',
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [],
      requires2fa: false,
    };
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues,
      isEditMode: true,
    });
    await flushPromises();

    const verfuegbarFuerRollenerweiterungSelect: VueWrapper = wrapper.findComponent({
      ref: 'verfuegbar-fuer-rollenerweiterung-select',
    });
    await verfuegbarFuerRollenerweiterungSelect.setValue(false);
    verfuegbarFuerRollenerweiterungSelect.vm.$emit('update:modelValue', false);
    await flushPromises();

    const dialog: Element | null = await vi.waitUntil(() => document.querySelector('[data-testid="warning-dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain(
      'Bitte beachten Sie, dass durch die Anpassung nach dem Speichern alle existierende Rollenerweiterungen automatisch entfernt werden.',
    );
  });

  test('it does not open warning dialog if rollenerweiterung is disabled on new service provider', async () => {
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: 'org-id',
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [],
      requires2fa: false,
    };
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues,
      isEditMode: false,
    });
    await flushPromises();

    const verfuegbarFuerRollenerweiterungSelect: VueWrapper = wrapper.findComponent({
      ref: 'verfuegbar-fuer-rollenerweiterung-select',
    });
    await verfuegbarFuerRollenerweiterungSelect.setValue(false);
    verfuegbarFuerRollenerweiterungSelect.vm.$emit('update:modelValue', false);
    await flushPromises();

    const dialog: Element | null = document.querySelector('[data-testid="warning-dialog"]');
    expect(dialog).toBeNull();
  });

  test('it opens warning dialog if rollenartenWhitelist is changed on an existing service provider', async () => {
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: 'org-id',
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [RollenArt.Sorgber, RollenArt.Nlehr],
      requires2fa: false,
    };
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues,
      isEditMode: true,
    });
    await flushPromises();

    const rollenartenWhitelistSelect: VueWrapper = wrapper.findComponent({
      ref: 'rollenarten-whitelist-select',
    });

    rollenartenWhitelistSelect.vm.$emit('update:focused', true);
    await rollenartenWhitelistSelect.setValue([RollenArt.Nlehr]);
    rollenartenWhitelistSelect.vm.$emit('update:modelValue', [RollenArt.Nlehr]);
    rollenartenWhitelistSelect.vm.$emit('update:focused', false);
    await flushPromises();

    const dialog: Element | null = await vi.waitUntil(() => document.querySelector('[data-testid="warning-dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain(
      'Bitte beachten Sie, dass durch die Anpassungen existierende Rollenerweiterungen für Rollen nicht mehr erlaubter Rollenarten nach dem Speichern automatisch entfernt werden.',
    );
    expect(dialog?.textContent).toContain('SorgBer');
    expect(dialog?.textContent).not.toContain('NLehr');
  });

  test('it does not open warning dialog if rollenartenWhitelist is changed and whitelist is laxer than before', async () => {
    const initialValues: ServiceProviderFormType = {
      selectedOrganisationId: 'org-id',
      name: 'Test Name',
      url: 'https://test-url.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      logoId: 1,
      customLogo: undefined,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [RollenArt.Sorgber, RollenArt.Nlehr],
      requires2fa: false,
    };
    const wrapper: VueWrapper<ComponentInstance<typeof ServiceProviderForm>> = mountComponent({
      initialValues,
      isEditMode: true,
    });
    await flushPromises();

    const rollenartenWhitelistSelect: VueWrapper = wrapper.findComponent({
      ref: 'rollenarten-whitelist-select',
    });

    rollenartenWhitelistSelect.vm.$emit('update:focused', true);
    await rollenartenWhitelistSelect.setValue([]);
    rollenartenWhitelistSelect.vm.$emit('update:modelValue', []);
    rollenartenWhitelistSelect.vm.$emit('update:focused', false);
    await flushPromises();

    const dialog: Element | null = document.querySelector('[data-testid="warning-dialog"]');
    expect(dialog).toBeNull();
  });
});
