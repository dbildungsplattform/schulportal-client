import { SortOrder, type OrganisationSortField } from '@/utils/sorting';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import type { Organisation } from './OrganisationStore';
import { SortField } from './PersonStore';
import { RollenArt, RollenMerkmal, type RolleResponse } from './RolleStore';
import { ServiceProviderKategorie } from './ServiceProviderStore';

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
  serviceProviderSchulePage: number;
  serviceProviderSchulePerPage: number;
  searchStringForRollen: string | null;
  searchStringForPersonen: string | null;
  searchStringForSchulen: string | null;
  searchStringForServiceProvider: string | null;
  selectedKlassen: Array<string> | null;
  selectedRollen: Array<string> | null;
  selectedRollenObjects: RolleResponse[];
  selectedOrganisationen: Array<string> | null;
  selectedOrgaObjects: Organisation[] | null;
  personenSortField: string | null;
  personenSortOrder: string | null;
  organisationenSortField: OrganisationSortField | null;
  organisationenSortOrder: SortOrder | null;
  currentSort: { key: string; order: 'asc' | 'desc' } | null;
  selectedSchuleForKlassen: string | null;
  selectedKlassenForKlassen: Array<string> | null;
  selectedSchuleForSchulischeServiceProvider: string | null;
  selectedMerkmaleForRollen: Array<RollenMerkmal>;
  selectedRollenartenForRollen: Array<RollenArt>;
  selectedOrganisationenForRollen: Array<string>;
  selectedAngeboteForRollen: Array<string>;
  selectedAngeboteNamesForRollen: Record<string, string>;
  selectedKategorienForServiceProvider: Array<ServiceProviderKategorie>;
};

type SearchFilterActions = {
  setKlasseFilterForPersonen: (selectedKlassen: Array<string> | null) => void;
  setRolleFilterForPersonen: (selectedRollen: Array<string> | null) => void;
  setRolleFilterWithObjectsForPersonen: (selectedRollen: Array<string> | null, rollenObjects: RolleResponse[]) => void;
  setOrganisationFilterForPersonen: (
    selectedOrganisationen: Array<string> | null,
    orgaObjects?: Organisation[],
  ) => void;
  setSearchFilterForRollen: (searchFilter: string | null) => void;
  setSearchFilterForPersonen: (searchStringForPersonen: string | null) => void;
  setSearchFilterForSchulen: (searchStringForSchulen: string | null) => void;
  setSearchFilterForServiceProvider: (searchStringForServiceProvider: string | null) => void;
  setSchuleFilterForKlassen: (selectedSchuleForKlassen: string | null) => void;
  setKlasseFilterForKlassen: (selectedKlassenForKlassen: Array<string> | null) => void;
  setSchuleForSchulischeServiceProvider: (selectedSchuleForSchulischeServiceProvider: string | null) => void;
  setMerkmaleFilterForRollen: (selectedMerkmale: Array<RollenMerkmal>) => void;
  setRollenartenFilterForRollen: (selectedRollenarten: Array<RollenArt>) => void;
  setOrganisationenFilterForRollen: (selectedOrganisationen: Array<string>) => void;
  setAngeboteFilterForRollen: (selectedAngebote: Array<string>) => void;
  setAngeboteNamesForRollen: (names: Record<string, string>) => void;
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
    serviceProviderSchulePage: 1,
    serviceProviderSchulePerPage: 30,
    searchStringForPersonen: '',
    searchStringForSchulen: '',
    searchStringForServiceProvider: '',
    searchStringForRollen: '',
    selectedKlassen: [],
    selectedRollen: [],
    selectedRollenObjects: [],
    selectedOrganisationen: [],
    selectedOrgaObjects: [],
    personenSortField: SortField.Familienname,
    personenSortOrder: SortOrder.Asc,
    organisationenSortField: null,
    organisationenSortOrder: null,
    currentSort: { key: SortField.Familienname, order: SortOrder.Asc },
    selectedSchuleForKlassen: null,
    selectedKlassenForKlassen: [],
    selectedSchuleForSchulischeServiceProvider: null,
    selectedMerkmaleForRollen: [],
    selectedRollenartenForRollen: [],
    selectedOrganisationenForRollen: [],
    selectedAngeboteForRollen: [],
    selectedAngeboteNamesForRollen: {},
    selectedKategorienForServiceProvider: [...DEFAULT_SERVICE_PROVIDER_KATEGORIEN],
  }),
  actions: {
    setKlasseFilterForPersonen(selectedKlassen: Array<string> | null) {
      this.selectedKlassen = selectedKlassen;
    },

    setRolleFilterForPersonen(selectedRollen: Array<string> | null) {
      this.selectedRollen = selectedRollen;
    },

    setOrganisationFilterForPersonen(selectedOrganisationen: Array<string> | null, orgaObjects?: Organisation[]) {
      this.selectedOrganisationen = selectedOrganisationen;
      this.selectedOrgaObjects = orgaObjects ?? [];
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

    setRolleFilterWithObjectsForPersonen(selectedRollen: Array<string> | null, rollenObjects: RolleResponse[]) {
      this.selectedRollen = selectedRollen;
      this.selectedRollenObjects = rollenObjects;
    },

    setSchuleFilterForKlassen(selectedSchuleForKlassen: string | null) {
      this.selectedSchuleForKlassen = selectedSchuleForKlassen;
    },

    setKlasseFilterForKlassen(selectedKlassenForKlassen: Array<string> | null) {
      this.selectedKlassenForKlassen = selectedKlassenForKlassen;
    },

    setSchuleForSchulischeServiceProvider(selectedSchuleForSchulischeServiceProvider: string | null) {
      this.selectedSchuleForSchulischeServiceProvider = selectedSchuleForSchulischeServiceProvider;
    },

    setMerkmaleFilterForRollen(selectedMerkmale: Array<RollenMerkmal>) {
      this.selectedMerkmaleForRollen = selectedMerkmale;
    },

    setRollenartenFilterForRollen(selectedRollenarten: Array<RollenArt>) {
      this.selectedRollenartenForRollen = selectedRollenarten;
    },

    setOrganisationenFilterForRollen(selectedOrganisationen: Array<string>) {
      this.selectedOrganisationenForRollen = selectedOrganisationen;
    },

    setAngeboteFilterForRollen(selectedAngebote: Array<string>) {
      this.selectedAngeboteForRollen = selectedAngebote;
    },

    setAngeboteNamesForRollen(names: Record<string, string>) {
      this.selectedAngeboteNamesForRollen = names;
    },

    setKategorienForServiceProvider(selectedKategorienForServiceProvider: Array<ServiceProviderKategorie>) {
      this.selectedKategorienForServiceProvider = selectedKategorienForServiceProvider;
    },

    resetKategorienForServiceProvider() {
      this.selectedKategorienForServiceProvider = [...DEFAULT_SERVICE_PROVIDER_KATEGORIEN];
    },
  },
});
