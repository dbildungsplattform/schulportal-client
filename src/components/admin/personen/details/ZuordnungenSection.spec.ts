import type { ZuordnungEditMode, ZuordnungOperation } from '@/composables/useZuordnungEditMode';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import {
  RollenArt,
  RollenMerkmal,
  useRolleStore,
  type RolleStore,
  type TranslatedRolleWithAttrs,
} from '@/stores/RolleStore';
import type { Person } from '@/stores/types/Person';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { enableAutoUnmount, flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { nextTick } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { VDialog } from 'vuetify/components';
import ZuordnungenSection from './ZuordnungenSection.vue';

// The logic of the operations is tested in the specs of the composables, this spec only tests how the section wires them
type ZuordnungenSectionVm = {
  navigateToZuordnungForm: () => void;
};

// State and handlers of the script setup that are not exposed but needed to reach states the UI prevents
type ZuordnungenSectionInternals = {
  editMode: ZuordnungEditMode;
  selectedChangeBefristung: string | undefined;
  handleSaveClick: () => Promise<void>;
};

type ZuordnungenSectionWrapper = VueWrapper<InstanceType<typeof ZuordnungenSection>>;

type ZuordnungCreationFormSetup = {
  sectionWrapper: ZuordnungenSectionWrapper;
  creationWrapper: VueWrapper;
};

type ZuordnungenSectionSetup = {
  authStore: AuthStore;
  configStore: ConfigStore;
  organisationStore: OrganisationStore;
  personStore: PersonStore;
  personenkontextStore: PersonenkontextStore;
  rolleStore: RolleStore;
  person: Person;
  rollen: TranslatedRolleWithAttrs[];
  schule: Organisation;
  oldKlasse: Organisation;
  mountComponent: (props?: Record<string, unknown>) => ZuordnungenSectionWrapper;
  getVm: (wrapper: ZuordnungenSectionWrapper) => ZuordnungenSectionVm;
  getInternals: (wrapper: ZuordnungenSectionWrapper) => ZuordnungenSectionInternals;
  isFormDirty: (wrapper: ZuordnungenSectionWrapper) => boolean;
  hasPendingChange: (wrapper: ZuordnungenSectionWrapper) => boolean;
  startEditingWithSelection: () => Promise<ZuordnungenSectionWrapper>;
  openZuordnungCreationForm: () => Promise<ZuordnungCreationFormSetup>;
};

describe('ZuordnungenSection', () => {
  enableAutoUnmount(afterEach);

  const setup = async (): Promise<ZuordnungenSectionSetup> => {
    const authStore: AuthStore = useAuthStore();
    const configStore: ConfigStore = useConfigStore();
    const organisationStore: OrganisationStore = useOrganisationStore();
    const personStore: PersonStore = usePersonStore();
    const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
    const rolleStore: RolleStore = useRolleStore();
    const person: Person = DoFactory.getPerson();
    const rollen: TranslatedRolleWithAttrs[] = [
      { value: 'lehr-rolle', title: 'Lehrkraft', merkmale: [RollenMerkmal.KopersPflicht], rollenart: RollenArt.Lehr },
      { value: 'lern-rolle', title: 'SuS', merkmale: [RollenMerkmal.BefristungPflicht], rollenart: RollenArt.Lern },
    ];
    const schule: Organisation = DoFactory.getSchule();
    const oldKlasse: Organisation = DoFactory.getKlasse(schule, { name: '9a' });
    const schulZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId: 'lern-rolle', rolle: 'Existing Lernrolle', rollenArt: RollenArt.Lern, editable: true },
      { organisation: schule },
    );
    const klassenZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId: 'lern-rolle', rolle: 'Existing Lernrolle', rollenArt: RollenArt.Lern, editable: true },
      { organisation: oldKlasse },
    );

    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;
    authStore.$reset();
    configStore.$reset();
    organisationStore.$reset();
    personStore.$reset();
    personenkontextStore.$reset();
    rolleStore.$reset();

    personStore.currentPerson = { person };
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [schulZuordnung, klassenZuordnung]);
    rolleStore.rollenForPersonenkontextCreation = rollen;

    const router: Router = createRouter({ history: createWebHistory(), routes });
    await router.push('/');
    await router.isReady();

    const mountComponent = (props: Record<string, unknown> = {}): ZuordnungenSectionWrapper =>
      mount(ZuordnungenSection, {
        attachTo: document.getElementById('app') || '',
        props: {
          personId: person.id,
          isEditPersonMetadataActive: false,
          ...props,
        },
        global: {
          plugins: [router],
        },
      });
    const getVm = (wrapper: ZuordnungenSectionWrapper): ZuordnungenSectionVm => {
      const vm: unknown = wrapper.vm;
      return vm as ZuordnungenSectionVm;
    };
    const getInternals = (wrapper: ZuordnungenSectionWrapper): ZuordnungenSectionInternals => {
      const vm: unknown = wrapper.vm;
      return vm as ZuordnungenSectionInternals;
    };
    const isFormDirty = (wrapper: ZuordnungenSectionWrapper): boolean =>
      wrapper.emitted<[boolean]>('update:isFormDirty')?.at(-1)?.[0] ?? false;
    const hasPendingChange = (wrapper: ZuordnungenSectionWrapper): boolean =>
      wrapper.emitted<[boolean]>('update:hasPendingChange')?.at(-1)?.[0] ?? false;
    const startEditingWithSelection = async (): Promise<ZuordnungenSectionWrapper> => {
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();
      await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
      await wrapper.get(`[data-testid="person-zuordnung-${schule.id}"] input[type="checkbox"]`).setValue(true);
      await flushPromises();
      return wrapper;
    };
    const openZuordnungCreationForm = async (): Promise<ZuordnungCreationFormSetup> => {
      const sectionWrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();
      await sectionWrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
      await sectionWrapper.get('[data-testid="zuordnung-create-button"]').trigger('click');
      await flushPromises();
      return { sectionWrapper, creationWrapper: sectionWrapper.findComponent({ name: 'PersonenkontextCreate' }) };
    };

    return {
      authStore,
      configStore,
      organisationStore,
      personStore,
      personenkontextStore,
      rolleStore,
      person,
      rollen,
      schule,
      oldKlasse,
      mountComponent,
      getVm,
      getInternals,
      isFormDirty,
      hasPendingChange,
      startEditingWithSelection,
      openZuordnungCreationForm,
    };
  };

  describe('view and edit mode', () => {
    test('it renders the Zuordnungen with their Klasse without loading the workflow step', async () => {
      const { mountComponent, schule, oldKlasse }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      expect(wrapper.find(`[data-testid="person-zuordnung-${schule.id}"]`).text()).toContain(oldKlasse.name);
    });

    test('it starts editing when the edit button is clicked', async () => {
      const { mountComponent }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      await wrapper.find('[data-testid="zuordnung-edit-button"]').trigger('click');

      expect(wrapper.emitted('update:isEditActive')).toEqual([[true]]);
      expect(wrapper.find('[data-testid="person-zuordnungen-section-edit"]').exists()).toBe(true);
    });

    test('it disables editing while the person metadata are edited', async () => {
      const { mountComponent }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent({
        isEditPersonMetadataActive: true,
      });
      await flushPromises();

      expect(wrapper.find('[data-testid="zuordnung-edit-button"]').attributes('disabled')).toBeDefined();
    });

    test('it can start and cancel editing a person without Zuordnungen', async () => {
      const { personStore, mountComponent }: ZuordnungenSectionSetup = await setup();
      personStore.personenuebersicht = null;
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
      expect(wrapper.find('[data-testid="person-zuordnungen-section-edit"]').exists()).toBe(true);

      await wrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');
      expect(wrapper.find('[data-testid="person-zuordnungen-section-view"]').exists()).toBe(true);
    });

    test('it cancels editing and discards the pending change', async () => {
      const { startEditingWithSelection, hasPendingChange }: ZuordnungenSectionSetup = await setup();
      const sectionWrapper: ZuordnungenSectionWrapper = await startEditingWithSelection();
      const personenkontextDelete: VueWrapper = sectionWrapper.findComponent({ name: 'PersonenkontextDelete' });
      personenkontextDelete.vm.$emit('onDeletePersonenkontext');
      await flushPromises();
      expect(hasPendingChange(sectionWrapper)).toBe(true);

      await sectionWrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');

      expect(hasPendingChange(sectionWrapper)).toBe(false);
      expect(sectionWrapper.emitted('update:isEditActive')?.at(-1)).toEqual([false]);
      expect(sectionWrapper.find('[data-testid="person-zuordnungen-section-view"]').exists()).toBe(true);
    });

    test('it shows the creation form again via the exposed navigateToZuordnungForm', async () => {
      const { mountComponent, getVm }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent({ isEditActive: true });
      await flushPromises();

      getVm(wrapper).navigateToZuordnungForm();
      await nextTick();

      expect(wrapper.find('[data-testid="zuordnung-creation-form"]').exists()).toBe(true);
    });
  });

  describe('saving the pending change', () => {
    const expectPendingChangeSaved = async (operation: ZuordnungOperation, text: string): Promise<void> => {
      const { mountComponent, getInternals, personenkontextStore }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent({ isEditActive: true });
      await flushPromises();
      getInternals(wrapper).editMode.forOperation(operation).showReview();
      await flushPromises();

      await wrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
      await flushPromises();

      expect(personenkontextStore.updatePersonenkontexte).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain(text);
    };

    describe('with a pending creation', () => {
      test('it saves the change and shows its success dialog', async () => {
        await expectPendingChangeSaved('creation', 'Die Zuordnung wurde erfolgreich hinzugefügt.');
      });
    });

    describe('with a pending deletion', () => {
      test('it saves the change and shows its success dialog', async () => {
        await expectPendingChangeSaved('deletion', 'Die Schulzuordnung wurde erfolgreich entfernt.');
      });
    });

    describe('with a pending changeKlasse', () => {
      test('it saves the change and shows its success dialog', async () => {
        await expectPendingChangeSaved('changeKlasse', 'Der Schüler wurde erfolgreich versetzt.');
      });
    });

    describe('with a pending changeBefristung', () => {
      test('it saves the change and shows its success dialog', async () => {
        await expectPendingChangeSaved('changeBefristung', 'Die Befristung wurde erfolgreich geändert.');
      });
    });

    test('it does nothing when saving without a pending change', async () => {
      const { mountComponent, getInternals, personenkontextStore }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      await getInternals(wrapper).handleSaveClick();

      expect(personenkontextStore.updatePersonenkontexte).not.toHaveBeenCalled();
    });
  });

  test('it displays the school of the selected Zuordnung when the workflow returns no organisations', async () => {
    const { personenkontextStore, schule, startEditingWithSelection }: ZuordnungenSectionSetup = await setup();
    personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse();
    const wrapper: ZuordnungenSectionWrapper = await startEditingWithSelection();

    await wrapper.get('[data-testid="klasse-change-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="schule-select"]').text()).toContain(`${schule.kennung} (${schule.name})`);
  });

  describe('dirty state', () => {
    test('it is not dirty while editing is inactive', async () => {
      const { mountComponent, isFormDirty }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      expect(isFormDirty(wrapper)).toBe(false);
    });

    test('it is not dirty while the creation form is untouched', async () => {
      const { mountComponent, isFormDirty }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent({ isEditActive: true });
      await flushPromises();

      expect(isFormDirty(wrapper)).toBe(false);
    });

    test('it is dirty as soon as a field of the change Klasse form differs', async () => {
      const { startEditingWithSelection, isFormDirty }: ZuordnungenSectionSetup = await setup();
      const sectionWrapper: ZuordnungenSectionWrapper = await startEditingWithSelection();
      await sectionWrapper.get('[data-testid="klasse-change-button"]').trigger('click');
      await flushPromises();
      // The Schule and the current Klasse are preselected
      expect(isFormDirty(sectionWrapper)).toBe(true);

      const klasseChange: VueWrapper = sectionWrapper.findComponent({ name: 'KlasseChange' });
      klasseChange.vm.$emit('update:selectedSchule', undefined);
      klasseChange.vm.$emit('update:selectedNewKlasse', undefined);
      await flushPromises();

      expect(isFormDirty(sectionWrapper)).toBe(false);
    });

    test('it is dirty as soon as the change Befristung form differs from the current Befristung', async () => {
      const { configStore, startEditingWithSelection, isFormDirty }: ZuordnungenSectionSetup = await setup();
      configStore.configData = {
        befristungBearbeitenEnabled: true,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      const sectionWrapper: ZuordnungenSectionWrapper = await startEditingWithSelection();
      await sectionWrapper.get('[data-testid="befristung-change-button"]').trigger('click');
      await flushPromises();
      // The current Befristung is preselected
      expect(isFormDirty(sectionWrapper)).toBe(false);

      const befristungInput: VueWrapper = sectionWrapper.findComponent({ name: 'BefristungInput' });
      befristungInput.vm.$emit('update:befristung', '31.07.2099');
      await flushPromises();

      expect(isFormDirty(sectionWrapper)).toBe(true);
    });
  });

  describe('creation form', () => {
    test('it resets the Rolle when PersonenkontextCreate requests it', async () => {
      const { openZuordnungCreationForm, rollen }: ZuordnungenSectionSetup = await setup();
      const { creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup = await openZuordnungCreationForm();

      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[1]);
      await nextTick();
      expect(personenkontextCreate.props()).toHaveProperty('selectedRolle', rollen[1]);

      personenkontextCreate.vm.$emit('fieldReset', 'selectedRolle');
      await nextTick();
      expect(personenkontextCreate.props()).toHaveProperty('selectedRolle', undefined);
    });

    test('enables submission only after the required Zuordnung fields are valid', async () => {
      const { openZuordnungCreationForm, schule, oldKlasse, rollen }: ZuordnungenSectionSetup = await setup();
      const { sectionWrapper, creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup =
        await openZuordnungCreationForm();
      const submitButton: DOMWrapper<Element> = sectionWrapper.find('[data-testid="zuordnung-creation-submit-button"]');

      expect(submitButton.attributes('disabled')).toBeDefined();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      await flushPromises();
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[1]);
      await flushPromises();
      expect(submitButton.attributes('disabled')).toBeDefined();

      personenkontextCreate.vm.$emit('update:selectedKlasse', oldKlasse);
      personenkontextCreate.vm.$emit('update:befristung', '31.07.2099');
      await vi.waitFor((): void => expect(submitButton.attributes('disabled')).toBeUndefined());
    });

    test('it forwards the events of PersonenkontextCreate to the creation form', async () => {
      const { openZuordnungCreationForm, isFormDirty, oldKlasse }: ZuordnungenSectionSetup = await setup();
      const { sectionWrapper, creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup =
        await openZuordnungCreationForm();

      expect(isFormDirty(sectionWrapper)).toBe(false);
      personenkontextCreate.vm.$emit('update:selectedKlasse', oldKlasse);
      await flushPromises();
      expect(isFormDirty(sectionWrapper)).toBe(true);

      personenkontextCreate.vm.$emit('update:befristung', '31.07.2099');
      await nextTick();
      expect(personenkontextCreate.props()).toHaveProperty(
        'befristungInputProps',
        expect.objectContaining({ befristung: '31.07.2099' }),
      );
      personenkontextCreate.vm.$emit('update:calculatedBefristungOption', '31.07.2099');
      await nextTick();
    });

    test('it shows the retained Klasse again when navigating back to the form after a failed save', async () => {
      const {
        openZuordnungCreationForm,
        getInternals,
        getVm,
        personenkontextStore,
        rollen,
        schule,
      }: ZuordnungenSectionSetup = await setup();
      const newKlasse: Organisation = DoFactory.getKlasse(schule, { name: '9b' });
      const { sectionWrapper, creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup =
        await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      await flushPromises();
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[1]);
      await flushPromises();
      personenkontextCreate.vm.$emit('update:selectedKlasse', newKlasse);
      await flushPromises();
      getInternals(sectionWrapper).editMode.forOperation('creation').showReview();
      await flushPromises();
      expect(sectionWrapper.findComponent({ name: 'PersonenkontextCreate' }).exists()).toBe(false);
      vi.mocked(personenkontextStore.updatePersonenkontexte).mockImplementationOnce(() => {
        personenkontextStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';
        return Promise.resolve();
      });
      await sectionWrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
      await flushPromises();

      getVm(sectionWrapper).navigateToZuordnungForm();
      await flushPromises();

      const reopenedCreate: VueWrapper = sectionWrapper.findComponent({ name: 'PersonenkontextCreate' });
      expect(reopenedCreate.props()).toHaveProperty('selectedKlasse', newKlasse);
      expect(reopenedCreate.findComponent({ name: 'KlassenFilter' }).props()).toHaveProperty(
        'selectedKlassen',
        newKlasse,
      );
    });

    test('it forwards the events of the KoPers.-Nr. input to the creation form', async () => {
      const { personStore, person, openZuordnungCreationForm, rollen, schule }: ZuordnungenSectionSetup = await setup();
      personStore.currentPerson = { person: { ...person, personalnummer: null } };
      const { sectionWrapper, creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup =
        await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
      await flushPromises();
      const kopersInput: VueWrapper = sectionWrapper.findComponent({ name: 'KopersInput' });

      kopersInput.vm.$emit('update:selectedKopersNr', '1234567');
      await flushPromises();

      expect(kopersInput.props()).toHaveProperty('selectedKopersNr', '1234567');
    });
  });

  describe('KoPers.-Nr. confirmation dialog', () => {
    const expectDialogClosedBy = async (buttonTestId: string): Promise<void> => {
      const { personStore, person, rollen, schule, openZuordnungCreationForm }: ZuordnungenSectionSetup = await setup();
      personStore.currentPerson = { person: { ...person, personalnummer: null } };
      const { sectionWrapper, creationWrapper: personenkontextCreate }: ZuordnungCreationFormSetup =
        await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
      await flushPromises();
      const kopersInput: VueWrapper = sectionWrapper.findComponent({ name: 'KopersInput' });
      kopersInput.vm.$emit('update:hasNoKopersNr', true);
      await flushPromises();

      expect(document.body.querySelector('[data-testid="no-kopersnr-confirmation-text"]')).not.toBeNull();
      const button: Element = await vi.waitUntil(() => document.body.querySelector(`[data-testid="${buttonTestId}"]`));
      button.dispatchEvent(new Event('click'));
      await flushPromises();

      expect(document.body.querySelector('[data-testid="no-kopersnr-confirmation-text"]')).toBeNull();
    };

    describe('when the user cancels', () => {
      test('it closes the dialog', async () => {
        await expectDialogClosedBy('cancel-no-kopersnr-button');
      });
    });

    describe('when the user proceeds', () => {
      test('it closes the dialog', async () => {
        await expectDialogClosedBy('confirm-no-kopersnr-button');
      });
    });
  });

  describe('change Befristung form', () => {
    test('it forwards the events of the Befristung input to the change Befristung form', async () => {
      const { configStore, startEditingWithSelection, getInternals }: ZuordnungenSectionSetup = await setup();
      configStore.configData = {
        befristungBearbeitenEnabled: true,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      const sectionWrapper: ZuordnungenSectionWrapper = await startEditingWithSelection();
      await sectionWrapper.get('[data-testid="befristung-change-button"]').trigger('click');
      await flushPromises();
      const befristungInput: VueWrapper = sectionWrapper.findComponent({ name: 'BefristungInput' });

      befristungInput.vm.$emit('update:befristung', '31.07.2099');
      await flushPromises();
      expect(getInternals(sectionWrapper).selectedChangeBefristung).toBe('31.07.2099');

      befristungInput.vm.$emit('update:calculatedBefristungOption', undefined);
      await flushPromises();
      expect(getInternals(sectionWrapper).selectedChangeBefristung).toBeUndefined();
    });
  });

  describe('dialogs', () => {
    test('it updates the visibility of all dialogs', async () => {
      const { mountComponent }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent();
      await flushPromises();

      for (const dialog of wrapper.findAllComponents(VDialog)) {
        dialog.vm.$emit('update:modelValue', true);
        dialog.vm.$emit('update:modelValue', false);
      }
      await flushPromises();

      expect(wrapper.findAllComponents(VDialog).length).toBeGreaterThan(0);
    });

    const expectDialogShown = async (
      visibleKey: string,
      messageKey: string | undefined,
      text: string,
    ): Promise<void> => {
      const { mountComponent }: ZuordnungenSectionSetup = await setup();
      const wrapper: ZuordnungenSectionWrapper = mountComponent({ isEditActive: true });
      await flushPromises();

      Object.assign(wrapper.vm, { [visibleKey]: true, ...(messageKey && { [messageKey]: text }) });
      await flushPromises();

      expect(document.body.textContent).toContain(text);
    };

    describe('cannot delete dialog', () => {
      test('it is shown with its message', async () => {
        await expectDialogShown(
          'cannotDeleteDialogVisible',
          undefined,
          'Sie dürfen sich selbst keine Zuordnungen entziehen.',
        );
      });
    });

    describe('create Zuordnung confirmation dialog', () => {
      test('it is shown with its message', async () => {
        await expectDialogShown(
          'createZuordnungConfirmationDialogVisible',
          'createZuordnungConfirmationDialogMessage',
          'Create message',
        );
      });
    });

    describe('change Klasse confirmation dialog', () => {
      test('it is shown with its message', async () => {
        await expectDialogShown(
          'changeKlasseConfirmationDialogVisible',
          'changeKlasseConfirmationDialogMessage',
          'Change Klasse message',
        );
      });
    });

    describe('change Befristung confirmation dialog', () => {
      test('it is shown with its message', async () => {
        await expectDialogShown(
          'changeBefristungConfirmationDialogVisible',
          'changeBefristungConfirmationDialogMessage',
          'Change Befristung message',
        );
      });
    });
  });
});
