export type SchuleDetailsForm = {
  selectedSchulform: string | undefined;
  selectedDienststellennummer: string | undefined;
  selectedSchulname: string | undefined;
  selectedEmailAdress: string | undefined;
};

export type Props = {
  initialValues: Partial<SchuleDetailsForm>;
  cachedValues?: Partial<SchuleDetailsForm>;
  isEditMode: boolean;
  schultraegerList: Organisation[] | undefined;
  showUnsavedChangesDialog: boolean;
  isLoading: boolean;
  errorCode?: string;
  selectedSchultraegerId?: string;
};

export type Emits = {
  (e: 'click:confirmUnsaved'): void;
  (e: 'click:discard'): void;
  (e: 'click:submit', values: SchuleDetailsForm): void;
  (e: 'update:canSubmit', value: boolean): void;
  (e: 'update:dirty', value: boolean): void;
  (e: 'update:showUnsavedChangesDialog', visible: boolean): void;
};
