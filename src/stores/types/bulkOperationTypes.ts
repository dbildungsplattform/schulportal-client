import type { PersonenkontextUpdate } from '../PersonenkontextStore';

export enum OperationType {
  MODIFY_ROLLE = 'MODIFY_ROLLE',
  DELETE_PERSON = 'DELETE_PERSON',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ROLLE_UNASSIGN = 'ROLLE_UNASSIGN',
  ORG_UNASSIGN = 'ORG_UNASSIGN',
  CHANGE_KLASSE = 'CHANGE_KLASSE',
  LOCK_PERSON = 'LOCK_PERSON',
  UNLOCK_PERSON = 'UNLOCK_PERSON',
}

export type CurrentOperation = {
  type: OperationType | null;
  isRunning: boolean;
  progress: number;
  complete: boolean;
  errors: Map<string, string>;
  data: Map<string, unknown>;
  successMessage?: string;
};

export type InternalZuordnung = PersonenkontextUpdate & {
  administriertVon?: string;
};
