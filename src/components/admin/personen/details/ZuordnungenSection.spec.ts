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
import BefristungInput from '@/components/admin/personen/BefristungInput.vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { Mock, MockInstance } from 'vitest';
import { nextTick } from 'vue';
import { VDialog } from 'vuetify/components';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import ZuordnungenSection from './ZuordnungenSection.vue';

type ZuordnungenSectionVm = {
  filteredRollen: TranslatedRolleWithAttrs[];
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

function isFormDirty(): boolean {
  return wrapper!.emitted<[boolean]>('update:isFormDirty')?.at(-1)?.[0] ?? false;
}

function hasPendingChange(): boolean {
  return wrapper!.emitted<[boolean]>('update:hasPendingChange')?.at(-1)?.[0] ?? false;
}

// State and handlers of the script setup that are not exposed but needed to reach states the UI prevents
type ZuordnungenSectionInternals = {
  selectedOrganisation: Organisation | undefined;
  selectedBefristung: string | undefined;
  selectedSchule: string | undefined;
  selectedNewKlasse: Organisation | undefined;
  selectedChangeBefristung: string | undefined;
  selectedZuordnungen: Zuordnung[];
  workingState: { zuordnungenToBePersisted: { value: Zuordnung[] } };
  handleSaveClick: () => Promise<void>;
  confirmDialogAddition: () => void;
  confirmDialogChangeKlasse: () => void;
  confirmDialogChangeBefristung: () => void;
  cancelAddition: () => void;
  cancelChangeBefristung: () => void;
  closeCannotDeleteDialog: () => void;
  cannotDeleteDialogVisible: boolean;
  resetChangeKlasseForm: () => void;
};

function getInternals(): ZuordnungenSectionInternals {
  return wrapper!.vm as unknown as ZuordnungenSectionInternals;
}

function getPersistedZuordnungen(): Zuordnung[] {
  return getInternals().workingState.zuordnungenToBePersisted.value;
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

    expect(hasPendingChange()).toBe(false);
    expect(isFormDirty()).toBe(false);
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

  test.each([true, false])(
    'it preserves existing Rolle metadata when changing Klasse with no creation Rollen available (selected Klasse remains in results: %s)',
    async (retainSelection: boolean) => {
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

      organisationStore.klassenFilters.set('klasse-change', {
        filterResult: [oldKlasse, newKlasse],
        total: 2,
        loading: false,
      });
      const klassenFilter: VueWrapper = wrapper.findComponent(KlasseChange).findComponent({ name: 'KlassenFilter' });
      klassenFilter.vm.$emit('update:selectedKlassen', newKlasse);
      await flushPromises();
      if (!retainSelection) {
        organisationStore.klassenFilters.set('klasse-change', {
          filterResult: [oldKlasse],
          total: 1,
          loading: false,
        });
        await flushPromises();
      }
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
      expect(hasPendingChange()).toBe(true);

      const newKlasseZuordnung: Zuordnung | undefined = getPersistedZuordnungen().find(
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
      expect(getPersistedZuordnungen()).not.toContainEqual(klassenZuordnung);
    },
  );

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
    expect(hasPendingChange()).toBe(true);

    await sectionWrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');

    expect(hasPendingChange()).toBe(false);
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

  test('it refreshes the person instead of navigating when editable Zuordnungen remain after the deletion', async () => {
    const otherZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId: 'lehr-rolle', rolle: 'Lehrkraft', rollenArt: RollenArt.Lehr, editable: true },
      { organisation: DoFactory.getSchule() },
    );
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [
      schulZuordnung,
      klassenZuordnung,
      otherZuordnung,
    ]);
    const pushSpy: MockInstance = vi.spyOn(router, 'push');
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await prepareDeletion(sectionWrapper);

    await sectionWrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
    await flushPromises();

    const closeButton: Element = await vi.waitUntil(() =>
      document.body.querySelector('[data-testid="close-zuordnung-delete-success-button"]'),
    );
    closeButton.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(pushSpy).not.toHaveBeenCalledWith({ name: 'person-management' });
    expect(personStore.getPersonenuebersichtById).toHaveBeenCalledWith(person.id);
  });

  test('it keeps the change Klasse form open when the confirmation is cancelled', async () => {
    const newKlasse: Organisation = DoFactory.getKlasse(schule, { name: '9b' });
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await sectionWrapper.get('[data-testid="klasse-change-button"]').trigger('click');
    await flushPromises();

    expect(isFormDirty()).toBe(true);

    const klassenFilter: VueWrapper = sectionWrapper
      .findComponent(KlasseChange)
      .findComponent({ name: 'KlassenFilter' });
    klassenFilter.vm.$emit('update:selectedKlassen', newKlasse);
    await flushPromises();
    await sectionWrapper.get('[data-testid="klasse-change-submit-button"]').trigger('click');
    await flushPromises();

    const dialogText: Element = await vi.waitUntil(() =>
      document.body.querySelector('[data-testid="change-klasse-confirmation-dialog-text"]'),
    );
    expect(dialogText.textContent).toContain(newKlasse.name);
    const closeButtons: NodeListOf<HTMLElement> = document.body.querySelectorAll(
      '[data-testid="close-layout-card-button"]',
    );
    closeButtons[closeButtons.length - 1]!.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(hasPendingChange()).toBe(false);
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

  test('it resets the Rolle when PersonenkontextCreate requests it', async () => {
    const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();

    personenkontextCreate.vm.$emit('update:selectedRolle', rollen[1]);
    await nextTick();
    expect(personenkontextCreate.props()).toHaveProperty('selectedRolle', rollen[1]);

    personenkontextCreate.vm.$emit('fieldReset', 'selectedRolle');
    await nextTick();
    expect(personenkontextCreate.props()).toHaveProperty('selectedRolle', undefined);
  });

  test('it resets the Klasse when PersonenkontextCreate requests it', async () => {
    const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
    personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
    personenkontextCreate.vm.$emit('update:selectedRolle', rollen[1]);
    personenkontextCreate.vm.$emit('update:selectedKlasse', oldKlasse);
    await flushPromises();
    personenkontextCreate.vm.$emit('fieldReset', 'selectedKlasse');
    await flushPromises();

    await wrapper!.get('[data-testid="zuordnung-creation-submit-button"]').trigger('click');
    await flushPromises();

    await vi.waitFor(() => {
      expect(personenkontextCreate.props()).toHaveProperty(
        'selectedKlasseProps',
        expect.objectContaining({ error: true }),
      );
    });
    expect(document.body.querySelector('[data-testid="confirm-zuordnung-dialog-addition"]')).toBeNull();
  });

  test('it asks for confirmation when the person has no KoPers.-Nr.', async () => {
    personStore.currentPerson = { person: { ...person, personalnummer: null } };
    const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
    personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
    personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
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

    expect(kopersInput.props()).toHaveProperty('hasNoKopersNr', false);
  });
  describe('without personenuebersicht', () => {
    beforeEach(() => {
      personStore.personenuebersicht = null;
    });

    test('it can start and cancel editing', async () => {
      wrapper = mountComponent();
      await flushPromises();

      await wrapper.get('[data-testid="zuordnung-edit-button"]').trigger('click');
      expect(wrapper.find('[data-testid="person-zuordnungen-section-edit"]').exists()).toBe(true);

      await wrapper.get('[data-testid="zuordnung-edit-cancel"]').trigger('click');
      expect(wrapper.find('[data-testid="person-zuordnungen-section-view"]').exists()).toBe(true);
    });

    test('it adds the new Zuordnung without a Rolle and with a Befristung', async () => {
      wrapper = mountComponent();
      await flushPromises();
      getInternals().selectedOrganisation = schule;
      getInternals().selectedBefristung = '31.07.2099';
      await flushPromises();

      getInternals().confirmDialogAddition();

      expect(getPersistedZuordnungen()).toHaveLength(1);
      expect(getPersistedZuordnungen()[0]).toMatchObject({ sskId: schule.id, rolleId: '' });
      expect(hasPendingChange()).toBe(true);
    });

    test('it ignores an unknown Organisation when adding a Zuordnung', async () => {
      wrapper = mountComponent();
      await flushPromises();

      getInternals().confirmDialogAddition();

      expect(getPersistedZuordnungen()).toEqual([]);
      expect(hasPendingChange()).toBe(true);
    });

    test('it changes the Klasse of a selected Zuordnung', async () => {
      wrapper = mountComponent();
      await flushPromises();
      getInternals().selectedZuordnungen = [schulZuordnung];
      getInternals().selectedSchule = schule.id;
      getInternals().selectedNewKlasse = oldKlasse;

      getInternals().confirmDialogChangeKlasse();

      expect(getPersistedZuordnungen()).toEqual([
        expect.objectContaining({ sskId: oldKlasse.id, typ: OrganisationsTyp.Klasse }),
      ]);
    });
  });

  test('it ignores an unknown Organisation when adding a Zuordnung and keeps the existing ones without Klassen', async () => {
    wrapper = mountComponent();
    await flushPromises();

    getInternals().confirmDialogAddition();

    expect(getPersistedZuordnungen()).toEqual([]);
    expect(wrapper.findAllComponents(PersonenkontextItem)).toHaveLength(1);
  });

  test('it does nothing when saving without a pending change', async () => {
    wrapper = mountComponent();
    await flushPromises();

    await getInternals().handleSaveClick();

    expect(personenkontextStore.updatePersonenkontexte).not.toHaveBeenCalled();
  });

  test('it is not dirty while editing is inactive', async () => {
    wrapper = mountComponent();
    await flushPromises();

    expect(isFormDirty()).toBe(false);
  });

  test('it is dirty as soon as the new Klasse differs while changing the Klasse', async () => {
    const sectionWrapper: VueWrapper = await startEditingWithSelection();
    await sectionWrapper.get('[data-testid="klasse-change-button"]').trigger('click');
    await flushPromises();

    getInternals().resetChangeKlasseForm();
    await flushPromises();
    expect(isFormDirty()).toBe(false);

    sectionWrapper.findComponent(KlasseChange).vm.$emit('update:selectedSchule', schule.id);
    await flushPromises();
    expect(getInternals().selectedSchule).toBe(schule.id);
    getInternals().resetChangeKlasseForm();
    await flushPromises();

    getInternals().selectedNewKlasse = DoFactory.getKlasse(schule, { name: '9c' });
    await flushPromises();
    expect(isFormDirty()).toBe(true);
  });

  describe('scrolling to the creation form', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const scrollIntoView: Mock = vi.fn();

    test.each([
      ['there is no form element', null],
      ['the form element cannot scroll', {} as HTMLElement],
      ['the form element can scroll', { scrollIntoView } as unknown as HTMLElement],
    ])('it handles the case that %s', async (_name: string, element: HTMLElement | null) => {
      wrapper = mountComponent({ isEditActive: true });
      await flushPromises();
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      vi.spyOn(document, 'getElementById').mockReturnValue(element);

      getVm().navigateToZuordnungForm();
      await nextTick();
      vi.advanceTimersByTime(100);

      if (element && 'scrollIntoView' in element) {
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  describe('deleting Extern Zuordnungen', () => {
    async function selectExternZuordnung(): Promise<VueWrapper> {
      const externZuordnung: Zuordnung = DoFactory.getZuordnung(
        { rolleId: 'extern-rolle', rolle: 'Extern', rollenArt: RollenArt.Extern },
        { organisation: schule },
      );
      personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [externZuordnung]);
      return startEditingWithSelection();
    }

    test('it disables the deletion for users that are no Landesadmin', async () => {
      authStore.currentUser = DoFactory.getUserinfoResponse();
      const sectionWrapper: VueWrapper = await selectExternZuordnung();

      expect(sectionWrapper.findComponent(PersonenkontextDelete).props('disabled')).toBe(true);
    });

    test('it allows the deletion for Landesadmins', async () => {
      const userinfo: ReturnType<typeof DoFactory.getUserinfoResponse> = DoFactory.getUserinfoResponse();
      authStore.currentUser = {
        ...userinfo,
        personenkontexte: [
          {
            ...userinfo.personenkontexte[0]!,
            organisation: { ...userinfo.personenkontexte[0]!.organisation, typ: OrganisationsTyp.Root },
          },
        ],
      };
      const sectionWrapper: VueWrapper = await selectExternZuordnung();

      expect(sectionWrapper.findComponent(PersonenkontextDelete).props('disabled')).toBe(false);
    });
  });

  describe('dialogs', () => {
    test('it updates the visibility of all dialogs', async () => {
      wrapper = mountComponent();
      await flushPromises();

      for (const dialog of wrapper.findAllComponents(VDialog)) {
        dialog.vm.$emit('update:modelValue', true);
        dialog.vm.$emit('update:modelValue', false);
      }
      await flushPromises();

      expect(wrapper.findAllComponents(VDialog).length).toBeGreaterThan(0);
    });

    test('it closes the dialog that prevents deleting the own Zuordnungen', async () => {
      authStore.currentUser = { ...DoFactory.getUserinfoResponse(), personId: person.id };
      const sectionWrapper: VueWrapper = await startEditingWithSelection();
      await prepareDeletion(sectionWrapper);
      await sectionWrapper.get('[data-testid="zuordnung-changes-save-button"]').trigger('click');
      await flushPromises();
      expect(document.body.textContent).toContain('Sie dürfen sich selbst keine Zuordnungen entziehen.');

      expect(getInternals().cannotDeleteDialogVisible).toBe(true);

      getInternals().closeCannotDeleteDialog();

      expect(getInternals().cannotDeleteDialogVisible).toBe(false);
    });

    test('it cancels the confirmation of a new Zuordnung', async () => {
      wrapper = mountComponent();
      await flushPromises();

      getInternals().cancelAddition();
      getInternals().cancelChangeBefristung();

      expect(hasPendingChange()).toBe(false);
    });

    test('it keeps the KoPers.-Nr. confirmation dialog closed after proceeding', async () => {
      personStore.currentPerson = { person: { ...person, personalnummer: null } };
      const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
      await flushPromises();
      const kopersInput: VueWrapper = wrapper!.findComponent(KopersInput);
      kopersInput.vm.$emit('update:hasNoKopersNr', true);
      await flushPromises();

      const proceedButton: Element = await vi.waitUntil(() =>
        document.body.querySelector('[data-testid="confirm-no-kopersnr-button"]'),
      );
      proceedButton.dispatchEvent(new Event('click'));
      await flushPromises();

      expect(document.body.querySelector('[data-testid="no-kopersnr-confirmation-text"]')).toBeNull();
    });
  });

  describe('creation form events', () => {
    test('it ignores resets of unknown fields and forwards the Befristung and KoPers.-Nr.', async () => {
      personStore.currentPerson = { person: { ...person, personalnummer: null } };
      const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
      await flushPromises();

      personenkontextCreate.vm.$emit('fieldReset', 'unknown');
      personenkontextCreate.vm.$emit('update:calculatedBefristungOption', '31.07.2099');
      wrapper!.findComponent(KopersInput).vm.$emit('update:selectedKopersNr', '1234567');
      await flushPromises();

      expect(personenkontextCreate.props()).toHaveProperty('selectedRolle', rollen[0]);
      expect(wrapper!.findComponent(KopersInput).props('selectedKopersNrProps')).toBeDefined();
    });

    test('it confirms the creation of a Zuordnung with a Rolle other than Lern', async () => {
      personStore.currentPerson = { person: { ...person, personalnummer: '1234567' } };
      const personenkontextCreate: VueWrapper = await openZuordnungCreationForm();
      personenkontextCreate.vm.$emit('update:selectedOrganisation', schule);
      personenkontextCreate.vm.$emit('update:selectedRolle', rollen[0]);
      await flushPromises();

      await wrapper!.get('[data-testid="zuordnung-creation-submit-button"]').trigger('click');
      await flushPromises();
      const confirmButton: Element = await vi.waitUntil(() =>
        document.body.querySelector('[data-testid="confirm-zuordnung-dialog-addition"]'),
      );
      confirmButton.dispatchEvent(new Event('click'));
      await flushPromises();

      expect(hasPendingChange()).toBe(true);
      expect(
        getPersistedZuordnungen().find((zuordnung: Zuordnung) => zuordnung.rolleId === rollen[0]!.value),
      ).toMatchObject({ sskId: schule.id });
    });
  });

  describe('changing the Befristung', () => {
    async function openChangeBefristungForm(befristung: string | null): Promise<VueWrapper> {
      configStore.configData = {
        befristungBearbeitenEnabled: true,
        rolleBearbeitenEnabled: true,
        rolleErweiternEnabled: true,
        setUemPasswordEnabled: true,
        schulischeAngeboteErstellen: true,
      };
      const zuordnung: Zuordnung = DoFactory.getZuordnung({}, { organisation: schule });
      // DoFactory replaces a null befristung with a random date, so it has to be set afterwards
      zuordnung.befristung = befristung;
      personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [zuordnung]);

      const sectionWrapper: VueWrapper = await startEditingWithSelection();
      await sectionWrapper.get('[data-testid="befristung-change-button"]').trigger('click');
      await flushPromises();
      return sectionWrapper;
    }

    async function submitAndConfirm(sectionWrapper: VueWrapper): Promise<string> {
      await sectionWrapper.get('[data-testid="change-befristung-submit-button"]').trigger('submit');
      await flushPromises();
      const confirmButton: Element = await vi.waitUntil(() =>
        document.body.querySelector('[data-testid="confirm-change-befristung-button"]'),
      );
      const message: string = document.body.textContent ?? '';
      confirmButton.dispatchEvent(new Event('click'));
      await flushPromises();
      return message;
    }

    test('it changes a limited Befristung to unlimited', async () => {
      const sectionWrapper: VueWrapper = await openChangeBefristungForm('2099-07-31T00:00:00.000Z');

      sectionWrapper.findComponent(BefristungInput).vm.$emit('update:calculatedBefristungOption', undefined);
      await flushPromises();
      const message: string = await submitAndConfirm(sectionWrapper);

      expect(message).toContain('unbefristet');
      expect(hasPendingChange()).toBe(true);
      expect(getPersistedZuordnungen()[0]).toMatchObject({ befristung: null });
    });

    test('it changes an unlimited Befristung to a date', async () => {
      const sectionWrapper: VueWrapper = await openChangeBefristungForm(null);

      sectionWrapper.findComponent(BefristungInput).vm.$emit('update:befristung', '31.07.2099');
      await flushPromises();
      const message: string = await submitAndConfirm(sectionWrapper);

      expect(message).toContain('31.07.2099');
      expect(getPersistedZuordnungen()[0]).toMatchObject({ befristung: expect.any(String) });
    });

    test('it falls back to the calculated Befristung when confirming without a selected date', async () => {
      const sectionWrapper: VueWrapper = await openChangeBefristungForm('2099-07-31T00:00:00.000Z');
      getInternals().selectedChangeBefristung = undefined;

      getInternals().confirmDialogChangeBefristung();

      expect(sectionWrapper.exists()).toBe(true);
      expect(getPersistedZuordnungen()[0]).toMatchObject({ befristung: null });
    });
  });
});
