import { SortOrder, type OrganisationSortField } from '@/utils/sorting';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import type { Organisation } from './OrganisationStore';
import { SortField } from './PersonStore';
import { RollenArt, RollenMerkmal, type RolleResponse } from './RolleStore';
import { ServiceProviderKategorie, type ServiceProviderIdNameResponse } from './ServiceProviderStore';

export const DEFAULT_SERVICE_PROVIDER_KATEGORIEN: ReadonlyArray<ServiceProviderKategorie> = [
  ServiceProviderKategorie.Email,
  ServiceProviderKategorie.Unterricht,
  ServiceProviderKategorie.Verwaltung,
  ServiceProviderKategorie.Hinweise,
];

type SearchFilterState = {
  klassenPage: number;
  klassenPerPage: number;
  personenPage: number;
  personenPerPage: number;
  rollenPage: number;
  rollenPerPage: number;
  schulenPage: number;
  schulenPerPage: number;
  schultraegerPage: number;
  schulentraegerPerPage: number;
  serviceProviderPage: number;
  serviceProviderPerPage: number;
  mptRollenPage: number;
  mptRollenPerPage: number;
  serviceProviderSchulePage: number;
  serviceProviderSchulePerPage: number;
  searchStringForRollen: string | null;
  searchStringForPersonen: string | null;
  searchStringForSchulen: string | null;
  searchStringForServiceProvider: string | null;
  selectedKlassen: Array<Organisation> | null;
  selectedRollen: RolleResponse[] | null;
  selectedOrganisationen: Organisation[] | null;
  personenSortField: string | null;
  personenSortOrder: string | null;
  organisationenSortField: OrganisationSortField | null;
  organisationenSortOrder: SortOrder | null;
  currentSort: { key: string; order: 'asc' | 'desc' } | null;
  selectedSchuleForKlassen: Organisation | null;
  selectedKlassenForKlassen: Array<Organisation> | null;
  selectedSchuleForMptRollen: Organisation | null;
  selectedSchuleForSchulischeServiceProvider: Organisation | null;
  selectedMerkmaleForRollen: Array<RollenMerkmal>;
  selectedRollenartenForRollen: Array<RollenArt>;
  selectedOrganisationenForRollen: Array<Organisation>;
  selectedServiceProvidersForRollen: ServiceProviderIdNameResponse[];
  selectedKategorienForServiceProvider: Array<ServiceProviderKategorie>;
};

type SearchFilterActions = {
  setKlasseFilterForPersonen: (selectedKlassen: Array<Organisation> | null) => void;
  setRolleFilterForPersonen: (selectedRollen: RolleResponse[] | null) => void;
  setOrganisationFilterForPersonen: (selectedOrganisationen: Organisation[] | null) => void;
  setSearchFilterForRollen: (searchFilter: string | null) => void;
  setSearchFilterForPersonen: (searchStringForPersonen: string | null) => void;
  setSearchFilterForSchulen: (searchStringForSchulen: string | null) => void;
  setSearchFilterForServiceProvider: (searchStringForServiceProvider: string | null) => void;
  setSchuleFilterForKlassen: (selectedSchuleForKlassen: Organisation | null) => void;
  setKlasseFilterForKlassen: (selectedKlassenForKlassen: Array<Organisation> | null) => void;
  setSchuleForMptRollen: (selectedSchuleForMptRollen: Organisation | null) => void;
  setSchuleForSchulischeServiceProvider: (selectedSchuleForSchulischeServiceProvider: Organisation | null) => void;
  setMerkmaleFilterForRollen: (selectedMerkmale: Array<RollenMerkmal>) => void;
  setRollenartenFilterForRollen: (selectedRollenarten: Array<RollenArt>) => void;
  setOrganisationenFilterForRollen: (selectedOrganisationen: Array<Organisation>) => void;
  setServiceProvidersFilterForRollen: (selectedServiceProviders: ServiceProviderIdNameResponse[]) => void;
  setKategorienForServiceProvider: (selectedKategorienForServiceProvider: Array<ServiceProviderKategorie>) => void;
  resetKategorienForServiceProvider: () => void;
};

type SearchFilterGetters = object;

export type SearchFilterStore = Store<'searchFilterStore', SearchFilterState, SearchFilterGetters, SearchFilterActions>;

export const rollenPerPageDefault: number = 30;
export const useSearchFilterStore: StoreDefinition<
  'searchFilterStore',
  SearchFilterState,
  SearchFilterGetters,
  SearchFilterActions
> = defineStore('searchFilterStore', {
  state: (): SearchFilterState => ({
    klassenPage: 1,
    klassenPerPage: 30,
    personenPage: 1,
    personenPerPage: 30,
    rollenPage: 1,
    rollenPerPage: rollenPerPageDefault,
    schulenPage: 1,
    schulenPerPage: 30,
    schultraegerPage: 1,
    schulentraegerPerPage: 30,
    serviceProviderPage: 1,
    serviceProviderPerPage: 30,
    mptRollenPage: 1,
    mptRollenPerPage: 30,
    serviceProviderSchulePage: 1,
    serviceProviderSchulePerPage: 30,
    searchStringForPersonen: '',
    searchStringForSchulen: '',
    searchStringForServiceProvider: '',
    searchStringForRollen: '',
    selectedKlassen: [],
    selectedRollen: [],
    selectedOrganisationen: [],
    personenSortField: SortField.Familienname,
    personenSortOrder: SortOrder.Asc,
    organisationenSortField: null,
    organisationenSortOrder: null,
    currentSort: { key: SortField.Familienname, order: SortOrder.Asc },
    selectedSchuleForKlassen: null,
    selectedKlassenForKlassen: [],
    selectedSchuleForMptRollen: null,
    selectedSchuleForSchulischeServiceProvider: null,
    selectedMerkmaleForRollen: [],
    selectedRollenartenForRollen: [],
    selectedOrganisationenForRollen: [],
    selectedServiceProvidersForRollen: [],
    selectedKategorienForServiceProvider: [...DEFAULT_SERVICE_PROVIDER_KATEGORIEN],
  }),
  actions: {
    setKlasseFilterForPersonen(selectedKlassen: Array<Organisation> | null) {
      this.selectedKlassen = selectedKlassen;
    },

    setRolleFilterForPersonen(selectedRollen: RolleResponse[] | null) {
      this.selectedRollen = selectedRollen;
    },

    setOrganisationFilterForPersonen(selectedOrganisationen: Organisation[] | null) {
      this.selectedOrganisationen = selectedOrganisationen;
    },

    setSearchFilterForPersonen(searchStringForPersonen: string | null) {
      this.searchStringForPersonen = searchStringForPersonen ?? '';
    },

    setSearchFilterForRollen(searchStringForRollen: string | null) {
      this.searchStringForRollen = searchStringForRollen ?? '';
    },

    setSearchFilterForSchulen(searchStringForSchulen: string | null) {
      this.searchStringForSchulen = searchStringForSchulen ?? '';
    },

    setSearchFilterForServiceProvider(searchStringForServiceProvider: string | null) {
      this.searchStringForServiceProvider = searchStringForServiceProvider ?? '';
    },

    setSchuleFilterForKlassen(selectedSchuleForKlassen: Organisation | null) {
      this.selectedSchuleForKlassen = selectedSchuleForKlassen;
    },

    setKlasseFilterForKlassen(selectedKlassenForKlassen: Array<Organisation> | null) {
      this.selectedKlassenForKlassen = selectedKlassenForKlassen;
    },

    setSchuleForMptRollen(selectedSchuleForMptRollen: Organisation | null) {
      this.selectedSchuleForMptRollen = selectedSchuleForMptRollen;
    },

    setSchuleForSchulischeServiceProvider(selectedSchuleForSchulischeServiceProvider: Organisation | null) {
      this.selectedSchuleForSchulischeServiceProvider = selectedSchuleForSchulischeServiceProvider;
    },

    setMerkmaleFilterForRollen(selectedMerkmale: Array<RollenMerkmal>) {
      this.selectedMerkmaleForRollen = selectedMerkmale;
    },

    setRollenartenFilterForRollen(selectedRollenarten: Array<RollenArt>) {
      this.selectedRollenartenForRollen = selectedRollenarten;
    },

    setOrganisationenFilterForRollen(selectedOrganisationen: Array<Organisation>) {
      this.selectedOrganisationenForRollen = selectedOrganisationen;
    },

    setServiceProvidersFilterForRollen(selectedServiceProviders: ServiceProviderIdNameResponse[]) {
      this.selectedServiceProvidersForRollen = selectedServiceProviders;
    },

    setKategorienForServiceProvider(selectedKategorienForServiceProvider: Array<ServiceProviderKategorie>) {
      this.selectedKategorienForServiceProvider = selectedKategorienForServiceProvider;
    },

    resetKategorienForServiceProvider() {
      this.selectedKategorienForServiceProvider = [...DEFAULT_SERVICE_PROVIDER_KATEGORIEN];
    },
  },
});
