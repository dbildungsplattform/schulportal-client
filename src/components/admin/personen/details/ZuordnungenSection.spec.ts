import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
import KlasseChange from '@/components/admin/klassen/KlasseChange.vue';
import KopersInput from '@/components/admin/personen/KopersInput.vue';
import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
import PersonenkontextDelete from '@/components/admin/personen/PersonenkontextDelete.vue';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
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
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { MockInstance } from 'vitest';
import { nextTick } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import ZuordnungenSection from './ZuordnungenSection.vue';

type ZuordnungenSectionVm = {
  filteredRollen: TranslatedRolleWithAttrs[];
  zuordnungenToBePersisted: Zuordnung[];
  hasPendingChange: boolean;
  isFormDirty: () => boolean;
  navigateToZuordnungForm: () => void;
};

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

let wrapper: VueWrapper | null = null;
let router: Router;

function mountComponent(props: Record<string, unknown> = {}): VueWrapper<InstanceType<typeof ZuordnungenSection>> {
  return mount(ZuordnungenSection, {
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
}

function getVm(): ZuordnungenSectionVm {
  return wrapper!.vm as unknown as ZuordnungenSectionVm;
}

describe('ZuordnungenSection', () => {
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

  beforeEach(async () => {
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
    personenkontextStore.workflowStepResponse = DoFactory.getPersonenkontextWorkflowResponse({
      organisations: [DoFactory.getOrganisationenResponseLegacy({ id: schule.id, name: schule.name })],
      canCommit: true,
    });
    rolleStore.rollenForPersonenkontextCreation = rollen;

    router = createRouter({ history: createWebHistory(), routes });
    router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  test('it renders the Zuordnungen with their Klasse and loads the workflow step', async () => {
    wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find(`[data-testid="person-zuordnung-${schule.id}"]`).text()).toContain(oldKlasse.name);
    expect(personenkontextStore.processWorkflowStep).toHaveBeenCalledWith(
      expect.objectContaining({ personId: person.id }),
    );
  });

  test('it starts editing when the edit button is clicked', async () => {
    wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-testid="zuordnung-edit-button"]').trigger('click');

    expect(wrapper.emitted('update:isEditActive')).toEqual([[true]]);
    expect(wrapper.find('[data-testid="person-zuordnungen-section-edit"]').exists()).toBe(true);
  });

  test('it disables editing while the person metadata are edited', async () => {
    wrapper = mountComponent({ isEditPersonMetadataActive: true });
    await flushPromises();

    expect(wrapper.find('[data-testid="zuordnung-edit-button"]').attributes('disabled')).toBeDefined();
  });

  test('filteredRollen returns all Rollen while no organisation is selected', async () => {
    wrapper = mountComponent();
    await flushPromises();

    expect(getVm().filteredRollen).toEqual(rollen);
  });

  test('it exposes the dirty and pending state', async () => {
    wrapper = mountComponent({ isEditActive: true });
    await flushPromises();

    expect(getVm().hasPendingChange).toBe(false);
    expect(getVm().isFormDirty()).toBe(false);
  });

  test('it navigates back to the creation form and resets the error', async () => {
    wrapper = mountComponent({ isEditActive: true });
    await flushPromises();
    personenkontextStore.errorCode = 'PERSONALNUMMER_NICHT_EINDEUTIG';

    getVm().navigateToZuordnungForm();
    await nextTick();

    expect(personenkontextStore.errorCode).toBe('');
    expect(wrapper.find('[data-testid="zuordnung-creation-form"]').exists()).toBe(true);
  });

  test('it preserves existing Rolle metadata when changing Klasse with no creation Rollen available', async () => {
    rolleStore.rollenForPersonenkontextCreation = [];
    const newKlasse: Organisation = DoFactory.getKlasse(schule, { name: '9b' });
    wrapper = mountComponent();
    await flushPromises();

    await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
    await wrapper.get(`[data-testid="person-zuordnung-${schule.id}"] input[type="checkbox"]`).setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="klasse-change-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="klasse-change-submit-button"]').attributes('disabled')).toBeDefined();

    const klassenFilter: VueWrapper = wrapper.findComponent(KlasseChange).findComponent({ name: 'KlassenFilter' });
    klassenFilter.vm.$emit('update:selectedKlassen', newKlasse.id);
    klassenFilter.vm.$emit('update:selectedKlassenObjects', [newKlasse]);
    await flushPromises();
    await wrapper.get('[data-testid="klasse-change-submit-button"]').trigger('click');
    await flushPromises();

    const confirmButton: Element = await vi.waitUntil(() =>
      document.body.querySelector('[data-testid="confirm-change-klasse-button"]'),
    );
    confirmButton.dispatchEvent(new Event('click'));
    await flushPromises();

    const pendingItems: VueWrapper<InstanceType<typeof PersonenkontextItem>>[] = wrapper
      .findAllComponents(PersonenkontextItem)
      .filter(
        (item: VueWrapper<InstanceType<typeof PersonenkontextItem>>) =>
          item.props('pendingState') === PendingState.CREATED,
      );
    expect(pendingItems).toHaveLength(1);
    expect.soft(pendingItems[0]!.props('zuordnung')).toMatchObject({
      sskId: schule.id,
      rolleId: schulZuordnung.rolleId,
      rolle: schulZuordnung.rolle,
      rollenArt: schulZuordnung.rollenArt,
      klasse: newKlasse.name,
    });
    expect(getVm().hasPendingChange).toBe(true);

    const newKlasseZuordnung: Zuordnung | undefined = getVm().zuordnungenToBePersisted.find(
      (zuordnung: Zuordnung) =>
        zuordnung.sskId === newKlasse.id &&
        zuordnung.rolleId === schulZuordnung.rolleId &&
        zuordnung.typ === OrganisationsTyp.Klasse,
    );
    expect(newKlasseZuordnung).toBeDefined();
    expect.soft(newKlasseZuordnung).toMatchObject({
      rolle: schulZuordnung.rolle,
      rollenArt: schulZuordnung.rollenArt,
    });
    expect(getVm().zuordnungenToBePersisted).not.toContainEqual(klassenZuordnung);
  });

  test('it prevents deleting the own Zuordnungen', async () => {
    authStore.currentUser = { ...DoFactory.getUserinfoResponse(), personId: person.id };
    wrapper = mountComponent();
    await flushPromises();

    await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
    await wrapper.get(`[data-testid="person-zuordnung-${schule.id}"] input[type="checkbox"]`).setValue(true);
    await flushPromises();
    const personenkontextDelete: VueWrapper = wrapper.findComponent({ name: 'PersonenkontextDelete' });
    personenkontextDelete.vm.$emit('onDeletePersonenkontext');
    await flushPromises();
    await wrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
    await flushPromises();

    expect(personenkontextStore.updatePersonenkontexte).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Sie dürfen sich selbst keine Zuordnungen entziehen.');
  });

  async function startEditingWithSelection(): Promise<VueWrapper> {
    wrapper = mountComponent();
    await flushPromises();
    await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
    await wrapper.get(`[data-testid="person-zuordnung-${schule.id}"] input[type="checkbox"]`).setValue(true);
    await flushPromises();
    return wrapper;
  }

  async function prepareDeletion(sectionWrapper: VueWrapper): Promise<void> {
    const personenkontextDelete: VueWrapper = sectionWrapper.findComponent(PersonenkontextDelete);
    personenkontextDelete.vm.$emit('onDeletePersonenkontext');
    await flushPromises();
  }

  async function openZuordnungCreationForm(): Promise<VueWrapper> {
    wrapper = mountComponent();
    await flushPromises();
    await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
    await wrapper.get('[data-testid="zuordnung-create-button"]').trigger('click');
    await flushPromises();
    return wrapper.findComponent(PersonenkontextCreate);
  }

  test('it cancels editing and discards the pending change', async () => {
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await prepareDeletion(sectionWrapper);
    expect(getVm().hasPendingChange).toBe(true);

    await sectionWrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');

    expect(getVm().hasPendingChange).toBe(false);
    expect(sectionWrapper.emitted('update:isEditActive')?.at(-1)).toEqual([false]);
    expect(sectionWrapper.find('[data-testid="person-zuordnungen-section-view"]').exists()).toBe(true);
  });

  test('it navigates to the person table after the last editable Zuordnung was deleted', async () => {
    const pushSpy: MockInstance = vi.spyOn(router, 'push');
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await prepareDeletion(sectionWrapper);

    await sectionWrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
    await flushPromises();

    expect(personenkontextStore.updatePersonenkontexte).toHaveBeenCalledWith([], person.id);
    const closeButton: Element = await vi.waitUntil(() =>
      document.body.querySelector('[data-testid="close-zuordnung-delete-success-button"]'),
    );
    closeButton.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({ name: 'person-management' });
    expect(personStore.getPersonenuebersichtById).not.toHaveBeenCalled();
  });

  test('it keeps the change Klasse form open when the confirmation is cancelled', async () => {
    const newKlasse: Organisation = DoFactory.getKlasse(schule, { name: '9b' });
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await sectionWrapper.get('[data-testid="klasse-change-button"]').trigger('click');
    await flushPromises();

    expect(getVm().isFormDirty()).toBe(true);

    const klassenFilter: VueWrapper = sectionWrapper
      .findComponent(KlasseChange)
      .findComponent({ name: 'KlassenFilter' });
    klassenFilter.vm.$emit('update:selectedKlassen', newKlasse.id);
    klassenFilter.vm.$emit('update:selectedKlassenObjects', [newKlasse]);
    await flushPromises();
    await sectionWrapper.get('[data-testid="klasse-change-submit-button"]').trigger('click');
    await flushPromises();

    expect(document.body.querySelector('[data-testid="change-klasse-confirmation-dialog-text"]')?.textContent).toContain(
      newKlasse.name,
    );
    const closeButtons: NodeListOf<HTMLElement> = document.body.querySelectorAll(
      '[data-testid="close-layout-card-button"]',
    );
    closeButtons[closeButtons.length - 1]!.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(getVm().hasPendingChange).toBe(false);
    expect(sectionWrapper.find('[data-testid="klasse-change-form"]').exists()).toBe(true);
  });

  test('it does not allow submitting an unchanged unlimited Befristung', async () => {
    configStore.configData = {
      befristungBearbeitenEnabled: true,
      rolleBearbeitenEnabled: true,
      rolleErweiternEnabled: true,
      setUemPasswordEnabled: true,
      schulischeAngeboteErstellen: true,
    };
    const unbefristeteZuordnung: Zuordnung = DoFactory.getZuordnung({}, { organisation: schule });
    // DoFactory replaces a null befristung with a random date, so it has to be cleared afterwards
    unbefristeteZuordnung.befristung = null;
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [unbefristeteZuordnung]);

    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await sectionWrapper.get('[data-testid="befristung-change-button"]').trigger('click');
    await flushPromises();

    expect(sectionWrapper.find('[data-testid="change-befristung-form"]').exists()).toBe(true);
    expect(sectionWrapper.get('[data-testid="change-befristung-submit-button"]').attributes('disabled')).toBeDefined();
  });

  test.each([['selectedRolle'], ['selectedKlasse']])(
    'it resets %s when PersonenkontextCreate requests it',
    async (field: string) => {
      const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
      const modelEvent: string = field === 'selectedRolle' ? 'update:selectedRolle' : 'update:selectedKlasse';

      personenkontextCreate.vm.$emit(modelEvent, 'some-id');
      await nextTick();
      expect(personenkontextCreate.props(field)).toBe('some-id');

      personenkontextCreate.vm.$emit('fieldReset', field);
      await nextTick();
      expect(personenkontextCreate.props(field)).toBeUndefined();
    },
  );

  test('it asks for confirmation when the person has no KoPers.-Nr.', async () => {
    personStore.currentPerson = { person: { ...person, personalnummer: null } };
    const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
    personenkontextCreate.vm.$emit('update:selectedOrganisation', schule.id);
    personenkontextCreate.vm.$emit('update:selectedRolle', 'lehr-rolle');
    await flushPromises();

    const kopersInput: VueWrapper = wrapper!.findComponent(KopersInput);
    kopersInput.vm.$emit('update:hasNoKopersNr', true);
    await flushPromises();

    const cancelButton: Element = await vi.waitUntil(() =>
      document.body.querySelector('[data-testid="cancel-no-kopersnr-button"]'),
    );
    expect(document.body.querySelector('[data-testid="no-kopersnr-confirmation-text"]')).not.toBeNull();
    cancelButton.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(kopersInput.props('hasNoKopersNr')).toBe(false);
  });
});
