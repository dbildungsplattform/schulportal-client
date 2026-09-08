import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { RollenArt, RollenMerkmal, type RolleResponse } from './RolleStore';
import {
  DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
  rollenPerPageDefault,
  useSearchFilterStore,
  type SearchFilterStore,
} from './SearchFilterStore';
import { ServiceProviderKategorie } from './ServiceProviderStore';

describe('SearchFilterStore', () => {
  let searchFilterStore: SearchFilterStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    searchFilterStore = useSearchFilterStore();
  });

  it('should initalize state correctly', () => {
    expect(searchFilterStore.selectedKlassen).toEqual([]);
    expect(searchFilterStore.selectedRollen).toEqual([]);
    expect(searchFilterStore.selectedOrganisationen).toEqual([]);
    expect(searchFilterStore.selectedRollenObjects).toEqual([]);
    expect(searchFilterStore.searchStringForRollen).toEqual('');
    expect(searchFilterStore.searchStringForPersonen).toEqual('');
    expect(searchFilterStore.searchStringForSchulen).toEqual('');
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('');
    expect(searchFilterStore.selectedSchuleForKlassen).toEqual(null);
    expect(searchFilterStore.selectedKlassenForKlassen).toEqual([]);
    expect(searchFilterStore.selectedSchuleForSchulischeServiceProvider).toEqual(null);
    expect(searchFilterStore.selectedMerkmaleForRollen).toEqual([]);
    expect(searchFilterStore.selectedRollenartenForRollen).toEqual([]);
    expect(searchFilterStore.selectedOrganisationenForRollen).toEqual([]);
    expect(searchFilterStore.rollenPerPage).toEqual(rollenPerPageDefault);
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual(DEFAULT_SERVICE_PROVIDER_KATEGORIEN);
    expect(searchFilterStore.selectedAngeboteForRollen).toEqual([]);
    expect(searchFilterStore.selectedAngeboteNamesForRollen).toEqual({});
  });

  it('should change the state', () => {
    // it sets the selectedKlassen
    searchFilterStore.setKlasseFilterForPersonen(['1', '2']);
    expect(searchFilterStore.selectedKlassen).toEqual(['1', '2']);

    // it sets the selectedRollen
    searchFilterStore.setRolleFilterForPersonen(['5', '8']);
    expect(searchFilterStore.selectedRollen).toEqual(['5', '8']);

    // it sets the selectedOrganisationen
    searchFilterStore.setOrganisationFilterForPersonen(['10', '20']);
    expect(searchFilterStore.selectedOrganisationen).toEqual(['10', '20']);

    // it sets the searchFilter for personen
    searchFilterStore.setSearchFilterForPersonen('search');
    expect(searchFilterStore.searchStringForPersonen).toEqual('search');
    searchFilterStore.setSearchFilterForPersonen(null);
    expect(searchFilterStore.searchStringForPersonen).toEqual('');

    // it sets the searchFilter for rollen name
    searchFilterStore.setSearchFilterForRollen('search');
    expect(searchFilterStore.searchStringForRollen).toEqual('search');
    searchFilterStore.setSearchFilterForRollen(null);
    expect(searchFilterStore.searchStringForRollen).toEqual('');

    // it sets the searchFilter for schulen
    searchFilterStore.setSearchFilterForSchulen('search');
    expect(searchFilterStore.searchStringForSchulen).toEqual('search');
    searchFilterStore.setSearchFilterForSchulen(null);
    expect(searchFilterStore.searchStringForSchulen).toEqual('');

    // it sets the searchFilter for service provider
    searchFilterStore.setSearchFilterForServiceProvider('search');
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('search');
    searchFilterStore.setSearchFilterForServiceProvider(null);
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('');

    // it sets the selectedRolleFilterWithObjects
    const rolleFilterObject: RolleResponse = DoFactory.getRolleResponse();
    searchFilterStore.setRolleFilterWithObjectsForPersonen(['5'], [rolleFilterObject]);
    expect(searchFilterStore.selectedRollenObjects).toEqual([rolleFilterObject]);

    // it sets the selectedSchuleForKlassen
    searchFilterStore.setSchuleFilterForKlassen('10');
    expect(searchFilterStore.selectedSchuleForKlassen).toEqual('10');

    // it sets the selectedKlassenForKlassen
    searchFilterStore.setKlasseFilterForKlassen(['10', '20']);
    expect(searchFilterStore.selectedKlassenForKlassen).toEqual(['10', '20']);

    searchFilterStore.setSchuleForSchulischeServiceProvider('10');
    expect(searchFilterStore.selectedSchuleForSchulischeServiceProvider).toEqual('10');

    searchFilterStore.setKategorienForServiceProvider([ServiceProviderKategorie.Email]);
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual([ServiceProviderKategorie.Email]);

    // it resets the selectedKategorienForServiceProvider back to the default selection
    searchFilterStore.resetKategorienForServiceProvider();
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual(DEFAULT_SERVICE_PROVIDER_KATEGORIEN);
  });

  it('should set merkmale filter for rollen', () => {
    searchFilterStore.setMerkmaleFilterForRollen([RollenMerkmal.KopersPflicht]);
    expect(searchFilterStore.selectedMerkmaleForRollen).toEqual([RollenMerkmal.KopersPflicht]);
  });

  it('should set rollenarten filter for rollen', () => {
    searchFilterStore.setRollenartenFilterForRollen([RollenArt.Lehr]);
    expect(searchFilterStore.selectedRollenartenForRollen).toEqual([RollenArt.Lehr]);
  });

  it('should set organisationen filter for rollen', () => {
    searchFilterStore.setOrganisationenFilterForRollen(['org1', 'org2']);
    expect(searchFilterStore.selectedOrganisationenForRollen).toEqual(['org1', 'org2']);
  });

  it('should set angebote filter for rollen', () => {
    searchFilterStore.setAngeboteFilterForRollen(['angebot1', 'angebot2']);
    expect(searchFilterStore.selectedAngeboteForRollen).toEqual(['angebot1', 'angebot2']);
  });

  it('should set angebote names for rollen', () => {
    searchFilterStore.setAngeboteNamesForRollen({ sp1: 'Provider One', sp2: 'Provider Two' });
    expect(searchFilterStore.selectedAngeboteNamesForRollen).toEqual({ sp1: 'Provider One', sp2: 'Provider Two' });
  });

  it('should overwrite existing angebote names for rollen', () => {
    searchFilterStore.setAngeboteNamesForRollen({ sp1: 'Provider One' });
    searchFilterStore.setAngeboteNamesForRollen({ sp2: 'Provider Two' });
    expect(searchFilterStore.selectedAngeboteNamesForRollen).toEqual({ sp2: 'Provider Two' });
  });
});
