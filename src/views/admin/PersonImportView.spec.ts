import { ImportDataItemStatus, type ImportResultResponse, type ImportUploadResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import { useImportStore, type ImportStore } from '@/stores/ImportStore';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { RollenArt, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import PersonImportView from './PersonImportView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;

const importStore: ImportStore = useImportStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const rolleStore: RolleStore = useRolleStore();

const schule: Organisation = DoFactory.getSchule();
organisationStore.organisationenFilters.set('', {
  total: 1,
  loading: false,
  filterResult: [schule, DoFactory.getSchule()],
});

rolleStore.allRollen = [
  DoFactory.getRolleWithServiceProviders({
    rollenart: RollenArt.Lehr,
  }),
  DoFactory.getRolleWithServiceProviders({
    rollenart: RollenArt.Lern,
  }),
];

async function selectSchule(value: string): Promise<ReturnType<VueWrapper['findComponent']> | undefined> {
  const schuleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = wrapper
    ?.findComponent({ ref: 'schulFilter' })
    .findComponent('[data-testid="person-import-schule-select"]');
  await schuleAutocomplete?.setValue(value);
  return schuleAutocomplete;
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = mount(PersonImportView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        PersonImportView: PersonImportView as Component,
      },
      plugins: [router],
    },
  });

  importStore.$reset();
  vi.resetAllMocks();
});

describe('PersonImportView', () => {
  test('it renders the person import view', () => {
    expect(wrapper?.find('[data-testid="person-import-headline"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="person-import-schule-select"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="rolle-select"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="file-input"]').isVisible()).toBe(true);
  });

  test('it shows validation messages', async () => {
    expect(wrapper?.find('#person-import-schule-select-messages').text()).toBe('');
    expect(wrapper?.find('#rolle-select-messages').text()).toBe('');
    expect(wrapper?.find('[data-testid="file-input"]').text()).not.toContain('Eine CSV-Datei muss ausgewählt werden.');

    await wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    // wait for transition to happen
    await vi.waitUntil(() => (wrapper?.find('#person-import-schule-select-messages').text().length ?? 0) > 0);

    expect(wrapper?.find('#person-import-schule-select-messages').text()).toContain(
      'Eine Schule muss ausgewählt werden.',
    );
    expect(wrapper?.find('#rolle-select-messages').text()).toContain('Eine Rolle muss ausgewählt werden.');
    expect(wrapper?.find('[data-testid="file-input"]').text()).toContain('Eine CSV-Datei muss ausgewählt werden.');
  });

  test('it clears selects', async () => {
    const schuleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = await selectSchule(schule.id);

    const rolleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent({
      ref: 'rolle-select',
    });
    rolleAutocomplete?.setValue('SuS');
    await nextTick();

    schuleAutocomplete?.find('.v-field__clearable').trigger('click');
    await nextTick();

    wrapper?.find('[data-testid="rolle-select"] .v-field__clearable').trigger('click');
    await nextTick();
  });

  test('it shows validation messages', async () => {
    expect(wrapper?.find('#person-import-schule-select-messages').text()).toBe('');
    expect(wrapper?.find('#rolle-select-messages').text()).toBe('');
    expect(wrapper?.find('[data-testid="file-input"]').text()).not.toContain('Eine CSV-Datei muss ausgewählt werden.');

    await wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    // wait for transition to happen
    await vi.waitUntil(() => (wrapper?.find('#person-import-schule-select-messages').text().length ?? 0) > 0);

    expect(wrapper?.find('#person-import-schule-select-messages').text()).toContain(
      'Eine Schule muss ausgewählt werden.',
    );
    expect(wrapper?.find('#rolle-select-messages').text()).toContain('Eine Rolle muss ausgewählt werden.');
    expect(wrapper?.find('[data-testid="file-input"]').text()).toContain('Eine CSV-Datei muss ausgewählt werden.');
  });

  test('it uploads a file', async () => {
    const mockFile: File = new File([''], 'personen.csv', { type: 'text/csv' });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');

    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });
    await nextTick();

    const uploadResponse: ImportUploadResponse = (importStore.uploadResponse = {
      importvorgangId: '1234567890',
      isValid: true,
      totalImportDataItems: 2,
      totalInvalidImportDataItems: 0,
      invalidImportDataItems: [],
    });

    wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    await nextTick();

    expect(importStore.uploadResponse).toStrictEqual(uploadResponse);
    expect(wrapper?.find('[data-testid="person-upload-success-text"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="open-confirmation-dialog-button"]').isVisible()).toBe(true);
  });

  test('it shows invalid data', async () => {
    const uploadResponse: ImportUploadResponse = (importStore.uploadResponse = {
      importvorgangId: '1234567890',
      isValid: false,
      totalImportDataItems: 2,
      totalInvalidImportDataItems: 2,
      invalidImportDataItems: [
        {
          nachname: '',
          vorname: 'Maria',
          klasse: '1a',
          validationErrors: ['IMPORT_DATA_ITEM_NACHNAME_IS_TOO_SHORT'],
        },
        {
          nachname: 'Meier',
          vorname: '',
          klasse: '2b',
          validationErrors: ['IMPORT_DATA_ITEM_VORNAME_IS_TOO_SHORT', 'IMPORT_DATA_ITEM_KLASSE_NOT_FOUND'],
        },
      ],
    });

    wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    await nextTick();

    expect(importStore.uploadResponse).toStrictEqual(uploadResponse);

    const invalidDataItems: DOMWrapper<Element>[] | undefined = wrapper?.findAll('[data-testid^="invalid-item-row"]');
    expect(invalidDataItems?.length).toBe(2);
  });

  test('it executes the import and returns to form', async () => {
    const mockFile: File = new File([''], 'personen.csv', { type: 'text/csv' });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');
    importStore.executePersonenImport = vi.fn();
    importStore.startImportStatusPolling = vi.fn();

    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });
    await nextTick();

    const uploadResponse: ImportUploadResponse = (importStore.uploadResponse = {
      importvorgangId: '1234567890',
      isValid: true,
      totalImportDataItems: 2,
      totalInvalidImportDataItems: 0,
      invalidImportDataItems: [],
    });

    wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    await nextTick();

    expect(importStore.uploadResponse).toStrictEqual(uploadResponse);
    expect(wrapper?.find('[data-testid="person-upload-success-text"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="open-confirmation-dialog-button"]').trigger('click');
    await nextTick();

    const importConfirmationText: Element = document.querySelector(
      '[data-testid="person-import-confirmation-text"]',
    ) as Element;
    const executeImportButton: HTMLInputElement = document.querySelector(
      '[data-testid="execute-import-button"]',
    ) as HTMLInputElement;

    expect(importConfirmationText).not.toBeNull();
    expect(executeImportButton).not.toBeNull();

    executeImportButton.click();
    await nextTick();

    expect(importStore.executePersonenImport).toHaveBeenCalledOnce();
    expect(importStore.startImportStatusPolling).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-testid="person-import-confirmation-text"]')).toBeNull();
  });

  test('it cancels the import and returns to form', async () => {
    const mockFile: File = new File([''], 'personen.csv', { type: 'text/csv' });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');
    importStore.executePersonenImport = vi.fn();
    importStore.startImportStatusPolling = vi.fn();

    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });
    await nextTick();

    const uploadResponse: ImportUploadResponse = (importStore.uploadResponse = {
      importvorgangId: '1234567890',
      isValid: true,
      totalImportDataItems: 2,
      totalInvalidImportDataItems: 0,
      invalidImportDataItems: [],
    });

    wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');
    await nextTick();

    expect(importStore.uploadResponse).toStrictEqual(uploadResponse);
    expect(wrapper?.find('[data-testid="person-upload-success-text"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="open-confirmation-dialog-button"]').trigger('click');
    await nextTick();

    const importConfirmationText: Element = document.querySelector(
      '[data-testid="person-import-confirmation-text"]',
    ) as Element;
    const cancelImportButton: HTMLInputElement = document.querySelector(
      '[data-testid="cancel-import-button"]',
    ) as HTMLInputElement;

    expect(importConfirmationText).not.toBeNull();
    expect(cancelImportButton).not.toBeNull();

    cancelImportButton.click();
    await nextTick();

    expect(importStore.executePersonenImport).not.toHaveBeenCalled();
    expect(importStore.uploadResponse).toBeNull();
    expect(importStore.importResponse).toBeNull();
    expect(importStore.errorCode).toBeNull();
    expect(document.querySelector('[data-testid="person-import-confirmation-text"]')).toBeNull();
  });

  test('it downloads an imported file through the download all button', async () => {
    importStore.importResponse = {
      importvorgandId: '1',
      rollenname: 'itslearning-Schulbegleitung',
      organisationsname: 'Carl-Orff-Schule',
      importedUsers: [
        {
          klasse: '9a',
          vorname: 'Max',
          nachname: 'Mstermann',
          benutzername: 'mmstermann117',
          startpasswort: 'pK0!V%m&',
          status: ImportDataItemStatus.Success,
        },
        {
          klasse: '9a',
          vorname: 'Maria',
          nachname: 'Mler',
          benutzername: 'mmler2288',
          startpasswort: 'qA0$z?gv',
          status: ImportDataItemStatus.Success,
        },
        {
          klasse: '9a',
          vorname: 'Youssef',
          nachname: 'fessouf',
          benutzername: 'mmler2388',
          startpasswort: 'qA0$z?gx',
          status: ImportDataItemStatus.Failed,
        },
      ],
      total: 5,
      pageTotal: 5,
    };

    globalThis.URL.createObjectURL = vi.fn();
    importStore.importProgress = 100;
    await nextTick();

    const downloadButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="download-all-data-button"]');
    downloadButton?.trigger('click');
  });

  test('it downloads an imported file with only successful users through the download all button', async () => {
    importStore.importResponse = {
      importvorgandId: '1',
      rollenname: 'itslearning-Schulbegleitung',
      organisationsname: 'Carl-Orff-Schule',
      importedUsers: [
        {
          klasse: '9a',
          vorname: 'Max',
          nachname: 'Mstermann',
          benutzername: 'mmstermann117',
          startpasswort: 'pK0!V%m&',
          status: ImportDataItemStatus.Success,
        },
        {
          klasse: '9a',
          vorname: 'Maria',
          nachname: 'Mler',
          benutzername: 'mmler2288',
          startpasswort: 'qA0$z?gv',
          status: ImportDataItemStatus.Success,
        },
      ],
      total: 5,
      pageTotal: 5,
    };

    globalThis.URL.createObjectURL = vi.fn();
    importStore.importProgress = 100;
    await nextTick();

    const downloadButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="download-all-data-button"]');
    downloadButton?.trigger('click');
  });

  test('it downloads an imported file with only failed users through the download all button', async () => {
    importStore.importResponse = {
      importvorgandId: '1',
      rollenname: 'itslearning-Schulbegleitung',
      organisationsname: 'Carl-Orff-Schule',
      importedUsers: [
        {
          klasse: '9a',
          vorname: 'Youssef',
          nachname: 'fessouf',
          benutzername: 'mmler2388',
          startpasswort: 'qA0$z?gx',
          status: ImportDataItemStatus.Failed,
        },
      ],
      total: 5,
      pageTotal: 5,
    };

    globalThis.URL.createObjectURL = vi.fn();
    importStore.importProgress = 100;
    await nextTick();

    const downloadButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="download-all-data-button"]');
    downloadButton?.trigger('click');
  });

  test('it does not duplicate rows when a page request fails during download', async () => {
    vi.useFakeTimers();

    importStore.uploadResponse = {
      importvorgangId: '1',
      isValid: true,
      totalImportDataItems: 3,
      totalInvalidImportDataItems: 0,
      invalidImportDataItems: [],
    };
    importStore.importedUsersPerPage = 1;
    importStore.importResponse = {
      importvorgandId: '1',
      rollenname: 'itslearning-Schulbegleitung',
      organisationsname: 'Carl-Orff-Schule',
      importedUsers: [],
      total: 3,
      pageTotal: 1,
    };

    const makePage = (benutzername: string): ImportResultResponse => ({
      importvorgandId: '1',
      rollenname: 'itslearning-Schulbegleitung',
      organisationsname: 'Carl-Orff-Schule',
      importedUsers: [
        {
          klasse: '9a',
          vorname: 'Vorname',
          nachname: 'Nachname',
          benutzername,
          startpasswort: 'pw',
          status: ImportDataItemStatus.Success,
        },
      ],
      total: 3,
      pageTotal: 1,
    });

    // Page at offset 1 fails on every attempt; the old code fell back to the previous page's stale data.
    const getImportedPersonsSpy: MockInstance = vi
      .spyOn(importStore, 'getImportedPersons')
      .mockImplementation((_id: string, offset?: number): Promise<void> => {
        if (offset === 0) {
          importStore.importResponse = makePage('alpha');
          return Promise.resolve();
        }
        if (offset === 2) {
          importStore.importResponse = makePage('charlie');
          return Promise.resolve();
        }
        importStore.importResponse = null;
        return Promise.resolve();
      });

    let capturedBlob: Blob | undefined;
    globalThis.URL.createObjectURL = vi.fn((blob: Blob): string => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    globalThis.URL.revokeObjectURL = vi.fn();

    importStore.importProgress = 100;
    await nextTick();

    const downloadButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="download-all-data-button"]');
    downloadButton?.trigger('click');

    await vi.runAllTimersAsync();
    await flushPromises();
    vi.useRealTimers();

    const fileContent: string = capturedBlob ? await capturedBlob.text() : '';

    expect(fileContent.match(/alpha/g)?.length).toBe(1);
    expect(fileContent.match(/charlie/g)?.length).toBe(1);
    // The failed middle page must be retried, not silently reused from stale state.
    expect(getImportedPersonsSpy.mock.calls.filter(([, offset]: [string, number]) => offset === 1)).toHaveLength(3);
  });

  test('it shows loading bar', async () => {
    importStore.importProgress = 5;
    importStore.errorCode = null;
    await flushPromises();

    expect(wrapper?.find('[data-testid="import-progress-bar"]').isVisible()).toBe(true);
  });

  test('it closes the layout card and navigates to person-management', () => {
    const push: MockInstance = vi.spyOn(router, 'push');

    wrapper
      ?.findComponent({ name: 'FormWrapper' })
      .find('[data-testid="person-import-form-discard-button"')
      .trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it resets the form for another upload', async () => {
    const schuleAutocomplete: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'schulFilter' })
      .findComponent({ ref: 'person-import-schule-select' });
    const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');
    const mockFile: File = new File([''], 'personen.csv', { type: 'text/csv' });

    importStore.importProgress = 100;
    schuleAutocomplete?.setValue('Schule');
    rolleAutocomplete?.setValue('SuS');
    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });
    await nextTick();

    const anotherImportButton: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="another-import-button"]');
    anotherImportButton?.trigger('click');
    await nextTick();

    expect(schuleAutocomplete?.text()).toBe('');
    expect(rolleAutocomplete?.text()).toBe('');
    expect(fileInput?.text()).toBe('');
  });

  test('it resets the store and navigates when discarding', async () => {
    const schuleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = wrapper
      ?.findComponent({ ref: 'schulFilter' })
      .findComponent({ ref: 'person-import-schule-select' });
    const rolleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent({
      ref: 'rolle-select',
    });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');
    const mockFile: File = new File([''], 'personen.csv', { type: 'text/csv' });

    importStore.errorCode = 'dummy';
    importStore.uploadResponse = {} as ImportStore['uploadResponse'];
    importStore.importProgress = 100;
    schuleAutocomplete?.setValue('Schule');
    rolleAutocomplete?.setValue('SuS');
    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });
    await nextTick();

    const closeDialogButton: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="close-layout-card-button"]',
    );
    closeDialogButton?.trigger('click');
    await nextTick();

    expect(importStore.errorCode).toBeNull();
    expect(importStore.uploadResponse).toBeNull();
    expect(importStore.importProgress).toBe(0);
    expect(schuleAutocomplete?.text()).toBe('');
    expect(rolleAutocomplete?.text()).toBe('');
    expect(fileInput?.text()).toBe('');
  });

  test.each([['utf-8'], ['windows-1252']])('it reads files with %s encoding', async (encoding: string) => {
    // Setup test constants
    const totalImportDataItems: number = 1234;

    // Find components
    const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    const fileInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="file-input"] input');

    // Create mock file with specific encoding
    const fileContent: ArrayBuffer | 'test' =
      encoding === 'windows-1252'
        ? new Uint8Array([0xc4, 0xd6, 0xdc]).buffer // ÄÖÜ in Windows-1252
        : 'test';
    const mockFile: File = new File([fileContent], 'personen.csv', {
      type: 'text/csv',
    });

    // Set form values
    await selectSchule(schule.id);
    await rolleAutocomplete?.setValue('SuS');
    Object.defineProperty(fileInput?.element, 'files', {
      value: [mockFile],
    });

    // Trigger file input change
    await fileInput?.trigger('change');
    await nextTick();

    // Mock the upload function
    const mockFunction: Mock = vi.fn(async () => {
      importStore.importResponse = null;
      importStore.uploadIsLoading = false;
      importStore.importIsLoading = false;
      importStore.errorCode = null;
      importStore.importProgress = 0;
      await nextTick();
      importStore.uploadResponse = {
        isValid: true,
        importvorgangId: '7561564',
        totalImportDataItems,
        totalInvalidImportDataItems: 0,
        invalidImportDataItems: [],
      };
    });
    importStore.uploadPersonenImportFile = mockFunction;

    // Submit form
    await wrapper?.find('[data-testid="person-import-form-submit-button"]').trigger('click');

    // Wait for and verify mock function call
    await vi.waitUntil(() => mockFunction.mock.calls.length > 0);
    expect(mockFunction).toHaveBeenCalledOnce();

    // Verify success message
    await vi.waitUntil(() => wrapper?.find('[data-testid="person-upload-success-text"]').exists());
    expect(wrapper?.find('[data-testid="person-upload-success-text"]').text()).toContain('erfolgreich');
    expect(wrapper?.find('[data-testid="person-upload-success-text"]').text()).toContain(
      totalImportDataItems.toString(),
    );
  });

  test('it clears selected rolle when clearSelectedRolle is called', async () => {
    const rolleAutocomplete: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    rolleAutocomplete?.setValue('SuS');
    await nextTick();

    expect(rolleAutocomplete?.text()).toBe('SuS');

    const clearButton: Element | null = document.body.querySelector('[data-testid="rolle-select"] i');
    expect(clearButton).not.toBeNull();

    if (clearButton) {
      clearButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    expect(rolleAutocomplete?.attributes('value')).toBeUndefined();
  });

  test('it clears selected schule when clearSelectedSchule is called', async () => {
    const schuleAutocomplete: ReturnType<VueWrapper['findComponent']> | undefined = await selectSchule(schule.id);
    await nextTick();

    const clearButton: Element | null = document.body.querySelector('[data-testid="person-import-schule-select"] i');
    expect(clearButton).not.toBeNull();

    if (clearButton) {
      clearButton.dispatchEvent(new Event('click'));
    }
    await flushPromises();

    expect(schuleAutocomplete?.attributes('value')).toBeUndefined();
  });
});
