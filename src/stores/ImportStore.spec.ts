import { ImportStatus, type ImportResultResponse, type ImportUploadResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { ImportDataItemStatus, useImportStore, type ImportStore } from './ImportStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('ImportStore', () => {
  let importStore: ImportStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    importStore = useImportStore();

    vi.useFakeTimers();
    // Mock setInterval and clearInterval to control timing
    vi.spyOn(globalThis, 'setInterval');
    vi.spyOn(globalThis, 'clearInterval');

    // Reset the store state
    importStore.$reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('should initalize state correctly', () => {
    expect(importStore.errorCode).toBeNull();
    expect(importStore.importResponse).toBeNull();
    expect(importStore.importIsLoading).toBeFalsy();
    expect(importStore.uploadIsLoading).toBeFalsy();
    expect(importStore.uploadResponse).toBeNull();
  });

  describe('import personen', () => {
    it('should upload personen import file', async () => {
      expect(importStore.uploadIsLoading).toBe(false);

      const mockResponse: ImportUploadResponse = {
        importvorgangId: '1234567890',
        isValid: true,
        totalImportDataItems: 2,
        totalInvalidImportDataItems: 0,
        invalidImportDataItems: [],
      };

      mockadapter.onPost('/api/import/upload').replyOnce(200, mockResponse);

      const organisationId: string = '123';
      const rolleId: string = '456';
      const personImportFile: File = new File([''], 'personen.csv', { type: 'text/csv' });

      const uploadPersonenImportFilePromise: Promise<void> = importStore.uploadPersonenImportFile(
        organisationId,
        rolleId,
        personImportFile,
      );
      await uploadPersonenImportFilePromise;

      expect(importStore.uploadResponse).toEqual(mockResponse);
      expect(importStore.uploadIsLoading).toBe(false);
    });

    it('should handle string error while uploading a file', async () => {
      mockadapter.onPost('/api/import/upload').replyOnce(500, 'some mock server error');

      const organisationId: string = '123';
      const rolleId: string = '456';
      const personImportFile: File = new File([''], 'personen.csv', { type: 'text/csv' });

      const uploadPersonenImportFilePromise: Promise<void> = importStore.uploadPersonenImportFile(
        organisationId,
        rolleId,
        personImportFile,
      );

      expect(importStore.uploadIsLoading).toBe(true);
      await uploadPersonenImportFilePromise;
      expect(importStore.uploadResponse).toEqual(null);
      expect(importStore.errorCode).toEqual('ERROR_UPLOADING_FILE');
      expect(importStore.uploadIsLoading).toBe(false);
    });

    it('should handle error code while uploading a file', async () => {
      mockadapter.onPost('/api/import/upload').replyOnce(500, { code: 'ERROR_UPLOADING_FILE' });

      const organisationId: string = '123';
      const rolleId: string = '456';
      const personImportFile: File = new File([''], 'personen.csv', { type: 'text/csv' });

      const uploadPersonenImportFilePromise: Promise<void> = importStore.uploadPersonenImportFile(
        organisationId,
        rolleId,
        personImportFile,
      );

      expect(importStore.uploadIsLoading).toBe(true);
      await uploadPersonenImportFilePromise;
      expect(importStore.uploadResponse).toEqual(null);
      expect(importStore.errorCode).toEqual('ERROR_UPLOADING_FILE');
      expect(importStore.uploadIsLoading).toBe(false);
    });

    describe('import personen', () => {
      it('should import personen', async () => {
        expect(importStore.importIsLoading).toBe(false);

        const mockResponse: File = new File([''], 'personen.txt', { type: 'text/plain' });

        mockadapter.onPost('/api/import/execute').replyOnce(200, mockResponse);

        const importvorgangId: string = '123';

        const executePersonenImportPromise: Promise<void> = importStore.executePersonenImport(importvorgangId);
        await executePersonenImportPromise;

        expect(importStore.importIsLoading).toBe(false);
      });

      it('should handle string error while importing personen', async () => {
        mockadapter.onPost('/api/import/execute').replyOnce(500, 'some mock server error');

        const importvorgangId: string = '123';

        const executePersonenImportPromise: Promise<void> = importStore.executePersonenImport(importvorgangId);

        expect(importStore.importIsLoading).toBe(true);
        await executePersonenImportPromise;
        expect(importStore.errorCode).toEqual('ERROR_IMPORTING_FILE');
        expect(importStore.importIsLoading).toBe(false);
      });

      it('should handle error code while importing personen', async () => {
        mockadapter.onPost('/api/import/execute').replyOnce(500, { code: 'ERROR_IMPORTING_FILE' });

        const importvorgangId: string = '123';
        const executePersonenImportPromise: Promise<void> = importStore.executePersonenImport(importvorgangId);

        expect(importStore.importIsLoading).toBe(true);
        await executePersonenImportPromise;
        expect(importStore.errorCode).toEqual('ERROR_IMPORTING_FILE');
        expect(importStore.importIsLoading).toBe(false);
      });
    });

    describe('startImportStatusPolling', () => {
      it('should poll and update status to finished', async () => {
        const importvorgangId: string = '123';

        mockadapter.onGet(`/api/import/${importvorgangId}/status`).replyOnce(200, { status: ImportStatus.Finished });
        mockadapter
          .onGet(`/api/import/importedUsers?offset=0&limit=100&importvorgangId=${importvorgangId}`)
          .replyOnce(200, []);

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        // Fast forward timer to trigger first poll
        vi.advanceTimersByTime(30000);
        await Promise.resolve(); // Allow async actions to settle

        await pollingPromise;

        expect(importStore.importStatus?.status).toEqual(ImportStatus.Finished);
        expect(importStore.importProgress).toEqual(100);
      });

      it('should poll and update progress bar to 50%', async () => {
        const importvorgangId: string = '123';

        mockadapter
          .onGet(`/api/import/${importvorgangId}/status`)
          .replyOnce(200, { status: ImportStatus.Inprogress, dataItemCount: 10, totalDataItemImported: 5 });

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        // Fast forward timer to trigger first poll
        vi.advanceTimersByTime(30000);
        await Promise.resolve(); // Allow async actions to settle

        await pollingPromise;

        expect(importStore.importStatus?.status).toEqual(ImportStatus.Inprogress);
        expect(importStore.importProgress).toEqual(50);
      });

      it('should not poll for FAILED and should throw ERROR_IMPORTING_FILE', async () => {
        const importvorgangId: string = '123';

        mockadapter.onGet(`/api/import/${importvorgangId}/status`).replyOnce(200, { status: ImportStatus.Failed });

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        // Fast forward timer to trigger first poll
        vi.advanceTimersByTime(30000);
        await Promise.resolve(); // Allow async actions to settle

        await pollingPromise;

        expect(importStore.errorCode).toEqual('ERROR_IMPORTING_FILE');
        expect(importStore.importStatus?.status).toEqual(ImportStatus.Failed);
        expect(importStore.importProgress).toEqual(0);
      });

      it('should not poll for INVALID and should throw ERROR_UPLOADING_FILE', async () => {
        const importvorgangId: string = '123';

        mockadapter.onGet(`/api/import/${importvorgangId}/status`).replyOnce(200, { status: ImportStatus.Invalid });

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        // Fast forward timer to trigger first poll
        vi.advanceTimersByTime(30000);
        await Promise.resolve(); // Allow async actions to settle

        await pollingPromise;

        expect(importStore.errorCode).toEqual('ERROR_UPLOADING_FILE');
        expect(importStore.importStatus?.status).toEqual(ImportStatus.Invalid);
        expect(importStore.importProgress).toEqual(0);
      });

      it('should stop polling after timeout', async () => {
        const importvorgangId: string = '123';

        mockadapter.onGet(`/api/import/${importvorgangId}/status`).reply(200, { status: ImportStatus.Inprogress });

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        // Fast forward timer to exceed max polling time (120 minutes)
        vi.advanceTimersByTime(120 * 60 * 1000 + 1);
        await pollingPromise;

        expect(importStore.errorCode).toEqual('IMPORT_TIMEOUT');
        expect(importStore.importProgress).toEqual(0);
      });

      it('should not poll if there is an error', async () => {
        const importvorgangId: string = '123';

        mockadapter.onGet(`/api/import/${importvorgangId}/status`).reply(500);

        const pollingPromise: Promise<void> = importStore.startImportStatusPolling(importvorgangId);

        await pollingPromise;

        expect(importStore.errorCode).toEqual('UNSPECIFIED_ERROR');
        expect(importStore.importProgress).toEqual(0);
      });
    });

    describe('ImportStore stopImportStatusPolling', () => {
      it('should clear interval and delete pollingInterval when interval exists', () => {
        // Simulate an existing interval
        const mockInterval: ReturnType<typeof setInterval> = setInterval(() => {
          // mock interval function
        }, 1000);
        importStore.pollingInterval = mockInterval;

        importStore.stopImportStatusPolling();

        expect(vi.mocked(clearInterval)).toHaveBeenCalledWith(mockInterval);
        expect(importStore.pollingInterval).toBeUndefined();
      });

      it('should do nothing when no polling interval exists', () => {
        // Ensure no interval is set
        importStore.pollingInterval = undefined;

        importStore.stopImportStatusPolling();

        expect(vi.mocked(clearInterval)).not.toHaveBeenCalled();
      });
    });

    describe('Get imported users', () => {
      it('should successfully retrieve imported persons', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        const mockResponse: ImportResultResponse = {
          importvorgandId: importvorgangId,
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

        mockadapter
          .onGet(`/api/import/importedUsers?offset=0&limit=5&importvorgangId=${importvorgangId}`)
          .reply(200, mockResponse);

        await importStore.getImportedPersons(importvorgangId, 0, 5);

        expect(importStore.importResponse).toEqual(mockResponse);
        expect(importStore.retrievalIsLoading).toBe(false);
        expect(importStore.errorCode).toBeNull();
      });

      it('should handle an i18nkey error response and set the correct error code', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        mockadapter
          .onGet(`/api/import/importedUsers?offset=0&limit=5&importvorgangId=${importvorgangId}`)
          .reply(500, { i18nKey: 'ERROR_IMPORTING_FILE' });

        await importStore.getImportedPersons(importvorgangId, 0, 5);

        expect(importStore.importResponse).toBeNull();
        expect(importStore.retrievalIsLoading).toBe(false);
        expect(importStore.errorCode).toBe('ERROR_IMPORTING_FILE');
      });

      it('should handle an error response and set the correct error code', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        mockadapter
          .onGet(`/api/import/importedUsers?offset=0&limit=5&importvorgangId=${importvorgangId}`)
          .reply(500, 'error');

        await importStore.getImportedPersons(importvorgangId, 0, 5);

        expect(importStore.importResponse).toBeNull();
        expect(importStore.retrievalIsLoading).toBe(false);
        expect(importStore.errorCode).toBe('ERROR_IMPORTING_FILE');
      });

      it('should handle an empty response', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        const mockResponse: ImportResultResponse = {
          importvorgandId: importvorgangId,
          rollenname: 'itslearning-Schulbegleitung',
          organisationsname: 'Carl-Orff-Schule',
          importedUsers: [],
          total: 0,
          pageTotal: 0,
        };

        mockadapter
          .onGet(`/api/import/importedUsers?offset=0&limit=5&importvorgangId=${importvorgangId}`)
          .reply(200, mockResponse);

        await importStore.getImportedPersons(importvorgangId, 0, 5);

        expect(importStore.importResponse).toEqual(mockResponse);
        expect(importStore.retrievalIsLoading).toBe(false);
        expect(importStore.errorCode).toBeNull();
      });
    });

    describe('Delete import vorgang by ID', () => {
      it('should successfully delete the import transaction', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        mockadapter.onDelete(`/api/import/${importvorgangId}`).reply(204);

        await importStore.deleteImportVorgangById(importvorgangId);

        expect(importStore.errorCode).toBeNull();
      });

      it('should handle an error response and set the specific error code', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        mockadapter
          .onDelete(`/api/import/${importvorgangId}`)
          .reply(500, { i18nKey: 'ERROR_DELETING_IMPORT_TRANSACTION' });

        await importStore.deleteImportVorgangById(importvorgangId);

        expect(importStore.errorCode).toBe('ERROR_DELETING_IMPORT_TRANSACTION');
      });

      it('should handle an error response and set the fallback error code', async () => {
        const importvorgangId: string = '8b7c40dd-c842-4f66-807d-6bd8c7cd5b54';

        mockadapter.onDelete(`/api/import/${importvorgangId}`).reply(500, 'error');

        await importStore.deleteImportVorgangById(importvorgangId);

        expect(importStore.errorCode).toBe('ERROR_IMPORTING_FILE');
      });
    });
  });
});
