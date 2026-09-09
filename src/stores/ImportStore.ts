import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  ImportApiFactory,
  ImportStatus,
  type ImportApiInterface,
  type ImportResultResponse,
  type ImportUploadResponse,
  type ImportVorgangStatusResponse,
} from '../api-client/generated/api';

export {
  ImportDataItemStatus,
  type ImportedUserResponse,
  type ImportResultResponse,
} from '../api-client/generated/api';

const importApi: ImportApiInterface = ImportApiFactory(undefined, '', axiosApiInstance);

// 2 hours polling time at maximum
const MAX_POLLING_TIME: number = 120 * 60 * 1000;

export type ImportState = {
  errorCode: string | null;
  importResponse: ImportResultResponse | null;
  importIsLoading: boolean;
  uploadIsLoading: boolean;
  retrievalIsLoading: boolean;
  uploadResponse: ImportUploadResponse | null;
  importStatus: ImportVorgangStatusResponse | null;
  importProgress: number;
  pollingInterval?: ReturnType<typeof setInterval>;
  importedUsersPerPage: number;
  importedUsersPage: number;
};

type ImportGetters = object;
type ImportActions = {
  executePersonenImport: (importVorgangId: string) => Promise<void>;
  uploadPersonenImportFile: (organisationId: string, rolleId: string, file: File) => Promise<void>;
  getPersonenImportStatus: (importVorgangId: string) => Promise<void>;
  startImportStatusPolling: (importvorgangId: string) => Promise<void>;
  stopImportStatusPolling: () => void;
  getImportedPersons: (importVorgangId: string, offset?: number, limit?: number) => Promise<void>;
  deleteImportVorgangById: (importVorgangId: string) => Promise<void>;
};

export type ImportStore = Store<'importStore', ImportState, ImportGetters, ImportActions>;

export const useImportStore: StoreDefinition<'importStore', ImportState, ImportGetters, ImportActions> = defineStore(
  'importStore',
  {
    state: (): ImportState => {
      return {
        errorCode: null,
        importResponse: null,
        importIsLoading: false,
        retrievalIsLoading: false,
        uploadIsLoading: false,
        uploadResponse: null,
        importStatus: null,
        importProgress: 0,
        importedUsersPerPage: 100,
        importedUsersPage: 1,
      };
    },
    actions: {
      async getImportedPersons(importvorgangId: string, offset?: number, limit?: number): Promise<void> {
        this.retrievalIsLoading = true;
        try {
          const { data }: { data: ImportResultResponse } = await importApi.importControllerGetImportedUsers(
            importvorgangId,
            offset,
            limit,
          );

          this.importResponse = data;
        } catch (error: unknown) {
          this.importResponse = null;
          this.errorCode = getResponseErrorCode(error, 'ERROR_IMPORTING_FILE');
        } finally {
          this.retrievalIsLoading = false;
        }
      },

      async deleteImportVorgangById(importvorgangId: string): Promise<void> {
        try {
          await importApi.importControllerDeleteImportTransaction(importvorgangId);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ERROR_IMPORTING_FILE');
        }
      },

      async startImportStatusPolling(importvorgangId: string): Promise<void> {
        // Reset progress and status
        this.importProgress = 0;
        this.importStatus = null;

        const startTime: number = Date.now();

        const pollStatus = async (): Promise<void> => {
          try {
            await this.getPersonenImportStatus(importvorgangId);

            // Calculate real progress based on imported items
            if (this.importStatus?.dataItemCount) {
              // Calculate progress as a percentage of imported items
              const progressPercentage: number = this.importStatus.totalDataItemImported
                ? Math.floor((this.importStatus.totalDataItemImported / this.importStatus.dataItemCount) * 100)
                : 0;

              this.importProgress =
                this.importStatus.status === ImportStatus.Finished ? 100 : Math.max(1, progressPercentage);
            }

            // Stop polling on final states
            switch (this.importStatus?.status) {
              case ImportStatus.Finished:
                this.stopImportStatusPolling();
                this.importProgress = 100;
                await this.getImportedPersons(importvorgangId, 0, 100);
                break;
              case ImportStatus.Failed:
                this.stopImportStatusPolling();
                this.errorCode = 'ERROR_IMPORTING_FILE';
                this.importProgress = 0;
                break;
              case ImportStatus.Invalid:
                this.stopImportStatusPolling();
                this.errorCode = 'ERROR_UPLOADING_FILE';
                this.importProgress = 0;
                break;
              default:
                // Continue polling if not in a final state
                break;
            }

            // Stop polling if max time of 5 minutes is exceeded
            const elapsedTime: number = Date.now() - startTime;
            if (elapsedTime >= MAX_POLLING_TIME) {
              this.stopImportStatusPolling();
              this.errorCode = 'IMPORT_TIMEOUT';
              this.importProgress = 0;
            }
          } catch (_error: unknown) {
            this.stopImportStatusPolling();
            this.errorCode = 'UNSPECIFIED_ERROR';
            this.importProgress = 0;
          }
        };

        // Initial immediate call
        await pollStatus();

        // Start periodic polling with dynamic interval
        const totalItems: number = this.uploadResponse?.totalImportDataItems || 1;
        const dynamicPollingInterval: number = Math.max(1000, Math.min(10000, Math.floor(totalItems * 100)));
        this.pollingInterval = setInterval(pollStatus, dynamicPollingInterval);
      },

      stopImportStatusPolling(): void {
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          delete this.pollingInterval;
        }
      },

      async getPersonenImportStatus(importvorgangId: string): Promise<void> {
        try {
          const { data }: { data: ImportVorgangStatusResponse } =
            await importApi.importControllerGetImportStatus(importvorgangId);

          this.importStatus = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ERROR_IMPORTING_FILE');
          throw error;
        }
      },

      async executePersonenImport(importvorgangId: string): Promise<void> {
        this.importIsLoading = true;
        try {
          await importApi.importControllerExecuteImport({
            importvorgangId,
          });
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ERROR_IMPORTING_FILE');
        } finally {
          this.importIsLoading = false;
        }
      },

      async uploadPersonenImportFile(organisationId: string, rolleId: string, file: File): Promise<void> {
        this.uploadIsLoading = true;
        try {
          const { data }: { data: ImportUploadResponse } = await importApi.importControllerUploadFile(
            organisationId,
            rolleId,
            file,
          );

          this.uploadResponse = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ERROR_UPLOADING_FILE');
        } finally {
          this.uploadIsLoading = false;
        }
      },
    },
  },
);
