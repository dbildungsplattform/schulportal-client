import {
  DbiamPersonenuebersichtApiFactory,
  OrganisationsTyp,
  PersonenApiFactory,
  PersonenkontextApiFactory,
  RollenArt,
  type DbiamPersonenuebersichtApiInterface,
  type DBiamPersonenuebersichtResponse,
  type PersonenApiInterface,
  type PersonenkontextApiInterface,
  type PersonenkontexteUpdateResponse,
  type PersonenzuordnungenBearbeitenBodyParams,
} from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import {
  buildKlassenZuordnungen,
  calculateEarliestBefristung,
  combineZuordnungen,
  hasEditableZuordnungsLeft,
  hasZuordnungForOrganisation,
  mapToInternalZuordnungen,
} from '@/utils/bulkOperations';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import { mapZuordnungToPersonenkontextUpdate, type PersonenkontextUpdate } from './PersonenkontextStore';
import { OperationType, type CurrentOperation, type InternalZuordnung } from './types/bulkOperationTypes';
import { PersonenUebersicht } from './types/PersonenUebersicht';
import { Zuordnung } from './types/Zuordnung';

const personenApi: PersonenApiInterface = PersonenApiFactory(undefined, '', axiosApiInstance);
const personenKontextApi: PersonenkontextApiInterface = PersonenkontextApiFactory(undefined, '', axiosApiInstance);
const personenuebersichtApi: DbiamPersonenuebersichtApiInterface = DbiamPersonenuebersichtApiFactory(
  undefined,
  '',
  axiosApiInstance,
);

async function getPersonenuebersichtById(personId: string): Promise<DBiamPersonenuebersichtResponse> {
  const { data }: { data: DBiamPersonenuebersichtResponse } =
    await personenuebersichtApi.dBiamPersonenuebersichtControllerFindPersonenuebersichtenByPerson(personId);
  return data;
}

async function updatePersonenkontexte(
  personenkontexte: PersonenkontextUpdate[],
  personId: string,
  cachedUebersicht: DBiamPersonenuebersichtResponse,
): Promise<PersonenkontexteUpdateResponse> {
  const uebersicht: DBiamPersonenuebersichtResponse = cachedUebersicht;

  const updateParams: PersonenzuordnungenBearbeitenBodyParams = {
    lastModified: uebersicht.lastModifiedZuordnungen ?? undefined,
    count: uebersicht.zuordnungen.length ?? 0,
    personenkontexte,
  };

  const { data }: { data: PersonenkontexteUpdateResponse } =
    await personenKontextApi.personenkontextControllerBearbeitePersonenzuordnungen(personId, updateParams);

  return data;
}
type BulkOperationState = {
  currentOperation: CurrentOperation | null;
};

type BulkOperationGetters = unknown;

type BulkOperationActions = {
  resetState(): void;
  bulkUnassignPersonenFromOrg(organisationId: string, personIds: string[]): Promise<void>;
  bulkResetPassword(personIds: string[]): Promise<void>;
  bulkModifyPersonenRolle(
    personIDs: string[],
    selectedOrganisationId: string,
    selectedRolleId: string,
    befristung?: string,
    selectedKlasseId?: string,
  ): Promise<void>;
  bulkPersonenDelete(personIDs: string[]): Promise<void>;
  bulkLockPersonen(
    personIDs: string[],
    organisationId: string,
    operationType: OperationType.LOCK_PERSON | OperationType.UNLOCK_PERSON,
  ): Promise<void>;
  bulkChangeKlasse(personIDs: string[], selectedOrganisationId: string, newKlasseId: string): Promise<void>;
  bulkUnassignPersonenFromRolle(
    organisationId: string,
    rolleId: string,
    personIDs: string[],
    isRolleLern: boolean,
  ): Promise<void>;
  processPersonOperation<T>(
    operationType: OperationType,
    personIDs: string[],
    processFunction: (personId: string, index: number) => Promise<T>,
    successMessage?: string,
  ): Promise<void>;
};

export type BulkOperationStore = Store<
  'bulkOperationStore',
  BulkOperationState,
  BulkOperationGetters,
  BulkOperationActions
>;

export const useBulkOperationStore: StoreDefinition<
  'bulkOperationStore',
  BulkOperationState,
  BulkOperationGetters,
  BulkOperationActions
> = defineStore('bulkOperationStore', {
  state: (): BulkOperationState => ({
    currentOperation: {
      type: null,
      isRunning: false,
      progress: 0,
      complete: false,
      errors: new Map(),
      data: new Map(),
    },
  }),

  actions: {
    resetState() {
      this.currentOperation = {
        type: null,
        isRunning: false,
        progress: 0,
        complete: false,
        errors: new Map(),
        data: new Map(),
        successMessage: undefined,
      };
    },

    /**
     * Generic processor function for bulk person operations
     * @param operationType The type of operation being performed
     * @param personIDs Array of person IDs to process
     * @param processFunction Function to process each person ID
     * @param successMessage Optional success message to set when operation completes with no errors
     */
    async processPersonOperation<T>(
      operationType: OperationType,
      personIDs: string[],
      processFunction: (personId: string, index: number) => Promise<T>,
      successMessage?: string,
    ): Promise<void> {
      this.currentOperation = {
        type: operationType,
        isRunning: true,
        progress: 0,
        complete: false,
        errors: new Map(),
        data: new Map(),
        successMessage: undefined,
      };

      for (let i: number = 0; i < personIDs.length; i++) {
        const personId: string = personIDs[i]!;
        try {
          // eslint-disable-next-line no-await-in-loop
          await processFunction(personId, i);
        } finally {
          // Always update progress even if there was an error
          this.currentOperation.progress = Math.ceil(((i + 1) / personIDs.length) * 100);
        }
      }

      this.currentOperation.isRunning = false;
      this.currentOperation.complete = true;

      if (this.currentOperation.errors.size === 0 && successMessage) {
        this.currentOperation.successMessage = successMessage;
      }
    },

    async bulkModifyPersonenRolle(
      personIDs: string[],
      selectedOrganisationId: string,
      selectedRolleId: string,
      befristung?: string,
      selectedKlasseId?: string,
    ): Promise<void> {
      await this.processPersonOperation(
        OperationType.MODIFY_ROLLE,
        personIDs,
        async (personId: string) => {
          try {
            const uebersichtResponse: DBiamPersonenuebersichtResponse = await getPersonenuebersichtById(personId);
            const uebersicht: PersonenUebersicht = PersonenUebersicht.fromResponse(uebersichtResponse);
            const currentZuordnungen: InternalZuordnung[] = mapToInternalZuordnungen(uebersicht.zuordnungen);

            if (!hasZuordnungForOrganisation(currentZuordnungen, selectedOrganisationId)) {
              this.currentOperation?.errors.set(personId, 'PERSON_HAS_NO_ZUORDNUNG_FOR_ORGANISATION');
              return;
            }

            // Build base organisation zuordnung
            const orgaZuordnung: InternalZuordnung = {
              organisationId: selectedOrganisationId,
              rolleId: selectedRolleId,
              ...(befristung && {
                befristung: calculateEarliestBefristung(befristung, currentZuordnungen, selectedOrganisationId),
              }),
            };

            // Build Klassen zuordnungen
            const klassenZuordnungen: InternalZuordnung[] = buildKlassenZuordnungen(
              selectedKlasseId,
              selectedRolleId,
              currentZuordnungen,
              selectedOrganisationId,
              orgaZuordnung.befristung,
            );

            const newZuordnungen: InternalZuordnung[] = [orgaZuordnung, ...klassenZuordnungen];
            const combinedZuordnungen: PersonenkontextUpdate[] = combineZuordnungen(currentZuordnungen, newZuordnungen);

            await updatePersonenkontexte(combinedZuordnungen, personId, uebersichtResponse);
          } catch (error: unknown) {
            this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
          }
        },
        'admin.rolle.rollenAssignedSuccessfully',
      );
    },

    async bulkUnassignPersonenFromOrg(organisationId: string, personIDs: string[]): Promise<void> {
      await this.processPersonOperation(OperationType.ORG_UNASSIGN, personIDs, async (personId: string) => {
        try {
          const uebersichtResponse: DBiamPersonenuebersichtResponse = await getPersonenuebersichtById(personId);
          const uebersicht: PersonenUebersicht = PersonenUebersicht.fromResponse(uebersichtResponse);

          const existingZuordnungen: Zuordnung[] = uebersicht.zuordnungen ?? [];
          const updatedZuordnungen: Zuordnung[] = existingZuordnungen.filter(
            (z: Zuordnung) => z.sskId !== organisationId && z.administriertVon !== organisationId,
          );

          if (updatedZuordnungen.length === existingZuordnungen.length) {
            return;
          }

          await updatePersonenkontexte(
            updatedZuordnungen.map(mapZuordnungToPersonenkontextUpdate),
            personId,
            uebersichtResponse,
          );
        } catch (error: unknown) {
          this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
        }
      });
    },

    async bulkResetPassword(personIds: string[]): Promise<void> {
      await this.processPersonOperation(OperationType.RESET_PASSWORD, personIds, async (id: string) => {
        try {
          const { data }: { data: string } = await personenApi.personControllerResetPasswordByPersonId(id);
          this.currentOperation?.data.set(id, data);
        } catch (error: unknown) {
          const errorCode: string = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
          this.currentOperation?.errors.set(id, errorCode);
        }
      });
    },

    async bulkLockPersonen(
      personIDs: string[],
      organisationId: string,
      operationType: OperationType.LOCK_PERSON | OperationType.UNLOCK_PERSON,
    ): Promise<void> {
      const lock: boolean = operationType === OperationType.LOCK_PERSON;
      const successMessage: string = lock ? 'admin.person.bulkLock.success' : 'admin.person.bulkUnlock.success';
      await this.processPersonOperation(
        operationType,
        personIDs,
        async (personId: string): Promise<void> => {
          try {
            await personenApi.personControllerLockPerson(personId, { lock, locked_by: organisationId });
          } catch (error: unknown) {
            this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
          }
        },
        successMessage,
      );
    },

    async bulkPersonenDelete(personIDs: string[]): Promise<void> {
      await this.processPersonOperation(
        OperationType.DELETE_PERSON,
        personIDs,
        async (personId: string) => {
          try {
            await personenApi.personControllerDeletePersonById(personId);
          } catch (error: unknown) {
            this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
          }
        },
        'admin.person.deletePersonBulkSuccessMessage',
      );
    },

    async bulkUnassignPersonenFromRolle(
      organisationId: string,
      rolleId: string,
      personIDs: string[],
      isRolleLern: boolean,
    ): Promise<void> {
      await this.processPersonOperation(
        OperationType.ROLLE_UNASSIGN,
        personIDs,
        async (personId: string) => {
          try {
            const uebersichtResponse: DBiamPersonenuebersichtResponse = await getPersonenuebersichtById(personId);
            const uebersicht: PersonenUebersicht = PersonenUebersicht.fromResponse(uebersichtResponse);
            const existingZuordnungen: Zuordnung[] = uebersicht.zuordnungen ?? [];

            // Shared predicate: should this Zuordnung be removed for this operation?
            const shouldRemoveZuordnung = (z: Zuordnung): boolean => {
              const isExactMatch: boolean = z.sskId === organisationId && z.rolleId === rolleId;
              const isChildOfOrganisation: boolean = z.administriertVon === organisationId && z.rolleId === rolleId;
              // If "lern" type, remove both exact matches and children
              // Otherwise, only remove exact matches
              return isRolleLern ? isExactMatch || isChildOfOrganisation : isExactMatch;
            };

            if (!hasEditableZuordnungsLeft(existingZuordnungen, shouldRemoveZuordnung)) {
              this.currentOperation?.errors.set(personId, 'NO_EDITABLE_ZUORDNUNGEN_LEFT');
              return;
            }

            const updatedZuordnungen: Zuordnung[] = existingZuordnungen.filter(
              (z: Zuordnung) => !shouldRemoveZuordnung(z),
            );
            if (updatedZuordnungen.length === existingZuordnungen.length) {
              return;
            }

            await updatePersonenkontexte(
              updatedZuordnungen.map(mapZuordnungToPersonenkontextUpdate),
              personId,
              uebersichtResponse,
            );
          } catch (error: unknown) {
            this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
          }
        },
        'admin.rolle.rollenUnassignedSuccessfully',
      );
    },

    async bulkChangeKlasse(personIDs: string[], selectedOrganisationId: string, newKlasseId: string): Promise<void> {
      await this.processPersonOperation(
        OperationType.CHANGE_KLASSE,
        personIDs,
        async (personId: string) => {
          try {
            const uebersichtResponse: DBiamPersonenuebersichtResponse = await getPersonenuebersichtById(personId);
            const uebersicht: PersonenUebersicht = PersonenUebersicht.fromResponse(uebersichtResponse);

            const existingZuordnungen: Zuordnung[] = uebersicht.zuordnungen ?? [];
            const zuordnungenToUpdate: Zuordnung[] = [];
            const zuordnungenToKeep: Zuordnung[] = [];

            for (const zuordnung of existingZuordnungen) {
              if (
                zuordnung.administriertVon === selectedOrganisationId &&
                zuordnung.typ === OrganisationsTyp.Klasse &&
                zuordnung.rollenArt === RollenArt.Lern
              ) {
                zuordnungenToUpdate.push(zuordnung);
              } else {
                zuordnungenToKeep.push(zuordnung);
              }
            }

            const newZuordnungen: Zuordnung[] = zuordnungenToUpdate.map((z: Zuordnung) => {
              const newZuordnung: Zuordnung = Zuordnung.from(z);
              newZuordnung.sskId = newKlasseId;
              return newZuordnung;
            });

            const combinedZuordnungen: Zuordnung[] = [...zuordnungenToKeep, ...newZuordnungen];

            await updatePersonenkontexte(
              combinedZuordnungen.map(mapZuordnungToPersonenkontextUpdate),
              personId,
              uebersichtResponse,
            );
          } catch (error: unknown) {
            this.currentOperation?.errors.set(personId, getResponseErrorCode(error, 'UNSPECIFIED_ERROR'));
          }
        },
        'admin.person.bulkChangeKlasse.success',
      );
    },
  },
});
