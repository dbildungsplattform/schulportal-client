import type { Organisation } from '@/stores/OrganisationStore';
import type { RollenArt } from '@/stores/RolleStore';
import type { ServiceProviderKategorie, ServiceProviderMerkmal } from '@/stores/ServiceProviderStore';

export type RollenerweiterungAssignErrorDialogProps = {
  isDialogVisible: boolean;
  filename?: string;
  dstNr: string;
  serviceProviderName: string;
  errors: MappedRollenerweiterungAssignError[];
};

export type MappedRollenerweiterungAssignError = {
  rolle: string;
  message: string;
};

export type ServiceProviderForm = {
  selectedOrganisationId: string | undefined;
  name: string;
  url: string;
  logoId: number | undefined;
  customLogo?: string | undefined;
  kategorie: ServiceProviderKategorie;
  nachtraeglichZuweisbar: boolean;
  verfuegbarFuerRollenerweiterung: boolean;
  anbietenInMerkmale: ServiceProviderMerkmal[];
  rollenartenWhitelist: RollenArt[];
  requires2fa: boolean;
};

export type ServiceProviderFormSubmitData = {
  selectedOrganisation?: Organisation;
  name: string;
  url: string;
  logoId: number | undefined;
  kategorie: ServiceProviderKategorie;
  merkmale: ServiceProviderMerkmal[];
  rollenartenWhitelist: RollenArt[];
  requires2fa: boolean;
};

export type ServiceProviderFormProps = {
  initialValues: Partial<ServiceProviderForm>;
  /**
   * Sets fields into dirty states
   */
  cachedValues?: Partial<ServiceProviderForm>;
  systemrecht: RollenSystemRecht;
  showUnsavedChangesDialog: boolean;
  errorCode?: string;
  loading?: boolean;
  isEditMode?: boolean;
};

export type SuccessDataItem = {
  label: string;
  value: string | number | undefined;
  testId: string;
  type?: 'text' | 'image';
  alt?: string;
};

export type SuccessDetails = {
  message: string;
  followingDataChanged: string;
  data: Array<SuccessDataItem>;
};
